import decodeLogs from '../helpers/decodeLogs';
import encodeCall from 'zos-core/test/helpers/encodeCall';

const ZepCore = artifacts.require('ZepCore');
const ZepToken = artifacts.require('ZepToken');
const KernelStakes = artifacts.require('KernelStakes');
const KernelRegistry = artifacts.require('KernelRegistry');
const KernelInstance = artifacts.require('KernelInstance');
const Registry = artifacts.require('Registry');
const ProjectController = artifacts.require('ProjectController');
const UpgradeabilityProxyFactory = artifacts.require('UpgradeabilityProxyFactory');

export class ControllerManager {
  constructor(controller, opts, txOpts) {
    this.controller = controller;
    this.opts = opts;
    this.txOpts = txOpts;
  }

  async createProxy(contractName, contractKlazz, initArgTypes, initArgs) {
    const initializeData = encodeCall('initialize', initArgTypes, initArgs);
    const { distribution, version } = this.opts;
    const { receipt } = await this.controller.createAndCall(distribution, version, contractName, initializeData, this.txOpts);
    const logs = decodeLogs([receipt.logs[0]], UpgradeabilityProxyFactory, 0x0);
    const address = logs.find(l => l.event === 'ProxyCreated').args.proxy;
    const proxy = contractKlazz.at(address);
    return proxy;
  }
}

export class RegistryManager {
  constructor(registry, opts, txOpts) {
    this.registry = registry;
    this.opts = opts;
    this.txOpts = txOpts;
  }

  async deployAndRegister(contractKlazz, contractName) {
    const { version } = this.opts;
    const implementation = await contractKlazz.new();
    await this.registry.addImplementation(version, contractName, implementation.address, this.txOpts);
  }
}

export default async function(args) {
  const { newVersionCost, developerFraction, owner } = args;

  const registry = await Registry.new({ from: owner })
  const registryManager = new RegistryManager(registry, { version: '0' }, { from: owner });
  
  await registryManager.deployAndRegister(KernelStakes, 'KernelStakes');
  await registryManager.deployAndRegister(KernelRegistry, 'KernelRegistry');
  await registryManager.deployAndRegister(ZepToken, 'ZepToken');
  await registryManager.deployAndRegister(ZepCore, 'ZepCore');

  const factory = await UpgradeabilityProxyFactory.new({ from: owner })
  const controllerContract = await ProjectController.new('ZeppelinOS', registry.address, factory.address, '0', { from: owner })
  const controller = new ControllerManager(controllerContract, { distribution: 'ZeppelinOS', version: '0' }, { from: owner });

  const kernelStakes = await controller.createProxy('KernelStakes', KernelStakes, ['address'], [owner]);
  const kernelRegistry = await controller.createProxy('KernelRegistry', KernelRegistry, ['address'], [owner]);
  const zepToken = await controller.createProxy('ZepToken', ZepToken, ['address'], [owner]);

  const zepCore = await controller.createProxy('ZepCore', ZepCore, 
    ['uint256', 'uint256', 'address', 'address', 'address'], 
    [newVersionCost, developerFraction, zepToken.address, kernelRegistry.address, kernelStakes.address]
  );

  await kernelStakes.transferOwnership(zepCore.address, { from: owner })
  await kernelRegistry.transferOwnership(zepCore.address, { from: owner })

  // TODO: Review naming
  return {
    ZepCore: zepCore,
    ZepToken: zepToken,
    KernelRegistry: kernelRegistry,
    KernelStakes: kernelStakes,
    ProjectController: controllerContract,
    Registry: registry,
    UpgradeabilityProxyFactory: factory
  }
}