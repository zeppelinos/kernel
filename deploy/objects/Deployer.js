import RegistryManager from './RegistryManager';
import ProjectControllerManager from './ProjectControllerManager';

const ZepCore = artifacts.require('ZepCore');
const Registry = artifacts.require('Registry');
const ZepToken = artifacts.require('ZepToken');
const KernelStakes = artifacts.require('KernelStakes');
const KernelRegistry = artifacts.require('KernelRegistry');
const KernelInstance = artifacts.require('KernelInstance');
const ProjectController = artifacts.require('ProjectController');
const UpgradeabilityProxyFactory = artifacts.require('UpgradeabilityProxyFactory');

const Deployer = {
  async projectController(projectOwner, projectName, fallbackProvider = 0) {
    const factory = await UpgradeabilityProxyFactory.new()
    const registry = await Registry.new({ from: projectOwner })
    return await ProjectController.new(projectName, registry.address, factory.address, fallbackProvider, { from: projectOwner });
  },

  async zepCore(owner, newVersionCost, developerFraction, distribution = 'ZeppelinOS') {
    const controller = await this.projectController(owner, distribution)
    const registry = Registry.at(await controller.registry())
    await this._registerZepCoreDependencies(registry);
    const controllerManager = new ProjectControllerManager(controller, owner);
    const kernelStakes = await controllerManager.createProxyAndCall(KernelStakes, 'KernelStakes', distribution, '0', ['address'], [owner]);
    const kernelRegistry = await controllerManager.createProxyAndCall(KernelRegistry, 'KernelRegistry', distribution, '0', ['address'], [owner]);
    const zepToken = await controllerManager.createProxyAndCall(ZepToken, 'ZepToken', distribution, '0', ['address'], [owner]);
    const zepCore = await controllerManager.createProxyAndCall(ZepCore, 'ZepCore', distribution, '0',
      ['uint256', 'uint256', 'address', 'address', 'address'],
      [newVersionCost, developerFraction, zepToken.address, kernelRegistry.address, kernelStakes.address]
    );
    await kernelStakes.transferOwnership(zepCore.address, { from: owner })
    await kernelRegistry.transferOwnership(zepCore.address, { from: owner })
    return { registry, zepCore, zepToken, kernelRegistry, kernelStakes, controller }
  },

  async _registerZepCoreDependencies(registry) {
    const registryManager = new RegistryManager(registry);
    await registryManager.deployAndRegister(KernelStakes, 'KernelStakes', '0');
    await registryManager.deployAndRegister(KernelRegistry, 'KernelRegistry', '0');
    await registryManager.deployAndRegister(ZepToken, 'ZepToken', '0');
    await registryManager.deployAndRegister(ZepCore, 'ZepCore', '0');
  },
}

export default Deployer
