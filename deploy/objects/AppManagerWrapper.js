import decodeLogs from '../../helpers/decodeLogs';
import encodeCall from 'zos-core/test/helpers/encodeCall';
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
    const initializeData = encodeCall('initialize', initArgTypes, initArgs);
    const { receipt } = await this.appManager.createAndCall(contractName, initializeData, { from: this.owner });
    const logs = decodeLogs([receipt.logs[0]], UpgradeabilityProxyFactory, 0x0);
    const address = logs.find(l => l.event === 'ProxyCreated').args.proxy;
    return contractKlazz.at(address);
  }
}
