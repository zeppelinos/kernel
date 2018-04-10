import decodeLogs from '../helpers/decodeLogs';
import encodeCall from 'zos-core/test/helpers/encodeCall';
const UpgradeabilityProxyFactory = artifacts.require('UpgradeabilityProxyFactory');

export default class ProjectControllerManager {
  constructor(controller, owner) {
    this.owner = owner;
    this.controller = controller;
  }

  async createProxy(contractKlazz, contractName, distribution, version) {
    const { receipt } = await this.controller.create(distribution, version, contractName, { from: this.owner });
    const logs = decodeLogs([receipt.logs[0]], UpgradeabilityProxyFactory, 0x0);
    const address = logs.find(l => l.event === 'ProxyCreated').args.proxy;
    return contractKlazz.at(address);
  }

  async createProxyAndCall(contractKlazz, contractName, distribution, version, initArgTypes, initArgs) {
    const initializeData = encodeCall('initialize', initArgTypes, initArgs);
    const { receipt } = await this.controller.createAndCall(distribution, version, contractName, initializeData, { from: this.owner });
    const logs = decodeLogs([receipt.logs[0]], UpgradeabilityProxyFactory, 0x0);
    const address = logs.find(l => l.event === 'ProxyCreated').args.proxy;
    return contractKlazz.at(address);
  }
}
