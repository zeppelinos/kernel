import BigNumber from 'bignumber.js'
import KernelDeployer from "../../../src/kernel/KernelDeployer"
import KernelProvider from "../../../src/kernel/KernelProvider"

contract('KernelProvider', ([_, owner]) => {
  const version = '0.0.1'
  const txParams = { from: owner }
  const newVersionConst = new BigNumber(2)
  const developerFraction = new BigNumber(10)

  beforeEach(async function () {
    this.kernel = await KernelDeployer.call(version, newVersionConst, developerFraction, txParams)
    this.fetchedKernel = await KernelProvider.fromAddress(this.kernel.address(), txParams)
  })

  describe('fromAddress', function () {
    it('fetches a wrapped kernel using the given address', async function () {
      assert.equal(this.fetchedKernel.address(), this.kernel.address())
      assert.equal(this.fetchedKernel.zepToken.address, this.kernel.zepToken.address)
      assert.equal(this.fetchedKernel.vouching.address, this.kernel.vouching.address)
      assert.equal(this.fetchedKernel.txParams.from, txParams.from)
    })
  })
})
