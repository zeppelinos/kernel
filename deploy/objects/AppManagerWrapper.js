import decodeLogs from '../../helpers/decodeLogs';
import encodeCall from 'zos-core/test/helpers/encodeCall';
const log = require('../logger');
const UpgradeabilityProxyFactory = artifacts.require('UpgradeabilityProxyFactory');

export default class AppManagerWrapper {
  constructor(appManager, owner) {
    this.owner = owner;
    this.appManager = appManager;
  }

  async createProxy(contractKlazz, contractName) {
    const { receipt } = await this.appManager.create(contractName, { from: this.owner });
    const logs = decodeLogs([receipt.logs[0]], UpgradeabilityProxyFactory, 0x0);
    const address = logs.find(l => l.event === 'ProxyCreated').args.proxy;
    return contractKlazz.at(address);
  }

  async createProxyAndCall(contractKlazz, contractName, initArgTypes, initArgs) {
    log(`Creating ${contractName} proxy`)
    const initializeData = encodeCall('initialize', initArgTypes, initArgs);
    const { receipt } = await this.appManager.createAndCall(contractName, initializeData, { from: this.owner });
    log(`TX receipt received: ${receipt.transactionHash}`)
    const logs = decodeLogs([receipt.logs[0]], UpgradeabilityProxyFactory, 0x0);
    const address = logs.find(l => l.event === 'ProxyCreated').args.proxy;
    log(`${contractName} proxy: ${address}`)
    return contractKlazz.at(address);
  }

  async upgradeProxy(proxyAddress, contractName) {
    return this.appManager.upgradeTo(proxyAddress, contractName, { from: this.owner });
  }

  async upgradeProxyAndCall(proxyAddress, contractName, methodName, argTypes, args) {
    const callData = encodeCall(methodName, argTypes, args);
    return this.appManager.upgradeToAndCall(proxyAddress, contractName, callData, { from: this.owner });
  }
}
