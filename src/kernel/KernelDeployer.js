import KernelWrapper from './KernelWrapper'
import { AppManagerDeployer, Logger } from 'zos-lib'

const log = new Logger('KernelDeployer')

export default {
  async call(version, newVersionCost, developerFraction, txParams = {}) {
    const appManager = await AppManagerDeployer.call(version, txParams)
    return await this.callWithImplementations(appManager, newVersionCost, developerFraction, {}, txParams)
  },

  async withAppManager(appManager, newVersionCost, developerFraction, txParams = {}) {
    return await this.callWithImplementations(appManager, newVersionCost, developerFraction, {}, txParams)
  },

  async callWithImplementations(appManager, newVersionCost, developerFraction, impls, txParams = {}) {
    this.appManager = appManager
    this.txParams = txParams
    await this.deployVouchingProxy(impls)
    await this.deployZepTokenProxy(impls)
    await this.deployKernelProxy(newVersionCost, developerFraction, impls)
    return new KernelWrapper(this.kernel, this.zepToken, this.vouching, this.txParams)
  },

  async registerImplementations(impls = {}) {
    await this.registerKernelImplementation(impls)
    await this.registerVouchingImplementation(impls)
    await this.registerZepTokenImplementation(impls)
  },

  async registerVouchingImplementation(impls = {}) {
    const Vouching = impls.Vouching || ContractsProvider.getFromKernel('Vouching')
    log.info('Registering Vouching implementation for Kernel...')
    await this.appManager.setImplementation(Vouching, 'Vouching')
    return Vouching;
  },

  async registerZepTokenImplementation(impls = {}) {
    const ZepToken = impls.ZepToken || ContractsProvider.getFromKernel('ZepToken')
    log.info('Registering ZepToken implementation for Kernel...')
    await this.appManager.setImplementation(ZepToken, 'ZepToken')
    return ZepToken;
  },

  async registerKernelImplementation(impls = {}) {
    const Kernel = impls.Kernel || ContractsProvider.getFromKernel('Kernel')
    log.info('Registering Kernel implementation for Kernel...')
    await this.appManager.setImplementation(impls.Kernel || Kernel, 'Kernel')
    return Kernel;
  },

  async deployVouchingProxy(impls) {
    const Vouching = await this.registerVouchingImplementation(impls);
    log.info('Deploying Vouching proxy...')
    this.vouching = await this.appManager.createProxy(Vouching, 'Vouching', 'initialize', [this.txParams.from])
    log.info('Deployed Vouching proxy: ', this.vouching.address)
  },

  async deployZepTokenProxy(impls) {
    const ZepToken = await this.registerZepTokenImplementation(impls);
    log.info('Deploying ZepToken proxy...')
    this.zepToken = await this.appManager.createProxy(ZepToken, 'ZepToken', 'initialize', [this.txParams.from])
    log.info('Deployed ZepToken proxy: ', this.zepToken.address)
  },

  async deployKernelProxy(newVersionCost, developerFraction, impls) {
    const Kernel = await this.registerKernelImplementation(impls);
    log.info('Deploying Kernel proxy...')
    const initArgs = [newVersionCost, developerFraction, this.zepToken.address, this.vouching.address]
    this.kernel = await this.appManager.createProxy(Kernel, 'Kernel', 'initialize', initArgs)
    log.info('Deployed Kernel proxy: ', this.kernel.address)
    log.info('Transferring Vouching ownership to Kernel proxy...')
    await this.vouching.transferOwnership(this.kernel.address, this.txParams)
  },
}
