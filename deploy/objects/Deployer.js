import AppManagerWrapper from './AppManagerWrapper';

const Kernel = artifacts.require('Kernel');
const ZepToken = artifacts.require('ZepToken');
const Vouching = artifacts.require('Vouching');
const Package = artifacts.require('Package');
const AppManager = artifacts.require('AppManager');
const ContractDirectory = artifacts.require('ContractDirectory');
const UpgradeabilityProxyFactory = artifacts.require('UpgradeabilityProxyFactory');

class Deployer {
  constructor(owner) {
    this.owner = owner;
  }

  async initAppManager(initialVersion) {
    const factory = await UpgradeabilityProxyFactory.new({ from: this.owner });
    this.package = await Package.new({ from: this.owner });
    this.contractDirectory = await ContractDirectory.new(0, { from: this.owner });
    await this.package.addVersion(initialVersion, this.contractDirectory.address, { from: this.owner });
    this.appManager = await AppManager.new(this.package.address, initialVersion, factory.address, { from: this.owner });
  }

  async atAppManager(address) {
    // TODO: Implement me to set this.(package, contractDirectory, appManager, appManagerWrapper)
  }

  async newVersion(versionName) {
    this.contractDirectory = await ContractDirectory.new(0, { from: this.owner });
    await this.package.addVersion(versionName, this.contractDirectory.address, { from: this.owner });
    this.appManager.setVersion(versionName, { from: this.owner });
  }

  async deployAndRegister(contractClass, contractName) {
    const implementation = await contractClass.new({ from: this.owner });
    await this.contractDirectory.setImplementation(contractName, implementation.address, { from: this.owner });
  }

  async registerKernel(impls = {}) {
    if (this.appManager === undefined) throw "Must call initAppManager or atAppManager first";
    await this.deployAndRegister(impls.Vouching || Vouching, 'Vouching');
    await this.deployAndRegister(impls.ZepToken || ZepToken, 'ZepToken');
    await this.deployAndRegister(impls.Kernel || Kernel, 'Kernel');
  }

  async deployKernel(newVersionCost, developerFraction) {
    if (this.appManager === undefined) throw "Must call initAppManager or atAppManager first";
    const appManagerWrapper = new AppManagerWrapper(this.appManager, this.owner);

    const vouching = await appManagerWrapper.createProxyAndCall(Vouching, 'Vouching', ['address'], [this.owner]);
    const zepToken = await appManagerWrapper.createProxyAndCall(ZepToken, 'ZepToken', ['address'], [this.owner]);
    const kernel = await appManagerWrapper.createProxyAndCall(Kernel, 'Kernel',
      ['uint256', 'uint256', 'address', 'address'],
      [newVersionCost, developerFraction, zepToken.address, vouching.address]
    );

    await vouching.transferOwnership(kernel.address, { from: this.owner });
    return { kernel, zepToken, vouching };
  }
}

export default Deployer
