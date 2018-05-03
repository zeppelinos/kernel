import KernelWrapper from './KernelWrapper'
import ContractsProvider from '../utils/ContractsProvider'

export default {
  async fromAddress(address, txParams = {}) {
    this._fetchKernel(address)
    await this._fetchZepToken()
    await this._fetchVouching()
    return new KernelWrapper(this.kernel, this.zepToken, this.vouching, txParams)
  },

  _fetchKernel(address) {
    const Kernel = ContractsProvider.getFromKernel('Kernel')()
    this.kernel = new Kernel(address)
  },

  async _fetchZepToken() {
    const ZepToken = ContractsProvider.getFromKernel('ZepToken')
    const zepTokenAddress = await this.kernel.token()
    this.zepToken = new ZepToken(zepTokenAddress)
  },

  async _fetchVouching() {
    const Vouching = ContractsProvider.getFromKernel('Vouching')
    const vouchingAddress = await this.kernel.vouches()
    this.vouching = new Vouching(vouchingAddress)
  },
}
