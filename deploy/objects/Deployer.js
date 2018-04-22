import AppManagerWrapper from './AppManagerWrapper';

const log = require('../logger');
const Kernel = artifacts.require('Kernel');
const Package = artifacts.require('Package');
const ZepToken = artifacts.require('ZepToken');
const Vouching = artifacts.require('Vouching');
const AppManager = artifacts.require('PackagedAppManager');
const ContractDirectory = artifacts.require('ContractDirectory');
const UpgradeabilityProxyFactory = artifacts.require('UpgradeabilityProxyFactory');

class Deployer {
  constructor(owner) {
    this.owner = owner;
  }

  async atAppManager(address) {
    // TODO: Implement me to set this.(package, contractDirectory, appManager, appManagerWrapper)
  }

  async initAppManager(initialVersion) {
    log('Deploying a new app manager...')
    const factory = await UpgradeabilityProxyFactory.new({ from: this.owner });
    log(` UpgradeabilityProxyFactory: ${factory.address}`)
    this.package = await Package.new({ from: this.owner });
    log(` Package: ${this.package.address}`)
    this.contractDirectory = await ContractDirectory.new(0, { from: this.owner });
    log(` Contract directory: ${this.contractDirectory.address}`)
    await this.package.addVersion(initialVersion, this.contractDirectory.address, { from: this.owner });
    log(` Added version ${initialVersion}`)
    this.appManager = await AppManager.new(this.package.address, initialVersion, factory.address, { from: this.owner });
    log(` App Manager ${this.appManager.address}`)
  }

  async addNewVersion(versionName) {
    this.contractDirectory = await ContractDirectory.new(0, { from: this.owner });
    await this.package.addVersion(versionName, this.contractDirectory.address, { from: this.owner });
    this.appManager.setVersion(versionName, { from: this.owner });
  }

  async registerKernelContractsInDirectory(impls = {}) {
    if (this.appManager === undefined) throw "Must call initAppManager or atAppManager first";
    log('Registering kernel contract dependencies implementations...')
    await this._deployAndRegister(impls.Vouching || Vouching, 'Vouching');
    await this._deployAndRegister(impls.ZepToken || ZepToken, 'ZepToken');
    await this._deployAndRegister(impls.Kernel || Kernel, 'Kernel');
  }

  async deployKernel(newVersionCost, developerFraction) {
    if (this.appManager === undefined) throw "Must call initAppManager or atAppManager first";
    const appManagerWrapper = new AppManagerWrapper(this.appManager, this.owner);
    log('Creating proxies for the Kernel...')
    const vouching = await appManagerWrapper.createProxyAndCall(Vouching, 'Vouching', ['address'], [this.owner]);
    log(' Vouching proxy: ', vouching.address)
    const zepToken = await appManagerWrapper.createProxyAndCall(ZepToken, 'ZepToken', ['address'], [this.owner]);
    log(' ZEP token proxy: ', zepToken.address)
    const kernel = await appManagerWrapper.createProxyAndCall(Kernel, 'Kernel',
      ['uint256', 'uint256', 'address', 'address'],
      [newVersionCost, developerFraction, zepToken.address, vouching.address]
    );
    log(' Kernel proxy: ', kernel.address)

    await vouching.transferOwnership(kernel.address, { from: this.owner });
    return { kernel, zepToken, vouching };
  }

  async _deployAndRegister(contractClass, contractName) {
    log(` Deploying ${contractName}`)
    const implementation = await contractClass.new({ from: this.owner });
    log(` ${contractName} implementation: ${implementation.address}`)
    await this.contractDirectory.setImplementation(contractName, implementation.address, { from: this.owner });
  }
}

export default Deployer
