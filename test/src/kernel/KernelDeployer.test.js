import BigNumber from 'bignumber.js'
import KernelDeployer from "../../../src/kernel/KernelDeployer"
import { AppManagerDeployer } from 'zos-lib'

const MockKernelV2 = artifacts.require('MockKernelV2');
const UpgradeabilityProxy = artifacts.require('UpgradeabilityProxy');

contract('KernelDeployer', ([_, owner]) => {
  const version = '0.0.1'
  const txParams = { from: owner }
  const newVersionConst = new BigNumber(2)
  const developerFraction = new BigNumber(10)

  describe('call', function () {
    beforeEach(async function () {
      this.kernel = await KernelDeployer.call(version, newVersionConst, developerFraction, txParams)
    })

    it('deploys a new kernel instance', async function () {
      assert.equal(await this.kernel.zepToken.owner(), owner)
      assert.equal(await this.kernel.vouching.owner(), this.kernel.address())

      assert(newVersionConst.eq(await this.kernel.newVersionCost()))
      assert(developerFraction.eq(await this.kernel.developerFraction()))
    })

    it('deploys an app manager for the kernel with the requested initial version', async function () {
      const appManager = KernelDeployer.appManager

      assert.equal(appManager.version, version)
      assert.equal(await appManager.appManager.owner(), owner)
      assert.equal(await appManager.getImplementation('Kernel'), await UpgradeabilityProxy.at(this.kernel.address()).implementation())
      assert.equal(await appManager.getImplementation('ZepToken'), await UpgradeabilityProxy.at(this.kernel.zepToken.address).implementation())
      assert.equal(await appManager.getImplementation('Vouching'), await UpgradeabilityProxy.at(this.kernel.vouching.address).implementation())
    })
  })

  describe('callWithAppManager', function () {
    beforeEach(async function () {
      this.appManager = await AppManagerDeployer.call(version, txParams)
      this.kernel = await KernelDeployer.callWithAppManager(this.appManager, newVersionConst, developerFraction, txParams)
    })

    it('deploys a new kernel instance', async function () {
      assert.equal(await this.kernel.zepToken.owner(), owner)
      assert.equal(await this.kernel.vouching.owner(), this.kernel.address())

      assert(newVersionConst.eq(await this.kernel.newVersionCost()))
      assert(developerFraction.eq(await this.kernel.developerFraction()))
    })

    it('uses the given app manager for the kernel', async function () {
      assert.equal(KernelDeployer.appManager, this.appManager)
      assert.equal(KernelDeployer.appManager.version, version)
      assert.equal(await this.appManager.getImplementation('Kernel'), await UpgradeabilityProxy.at(this.kernel.address()).implementation())
      assert.equal(await this.appManager.getImplementation('ZepToken'), await UpgradeabilityProxy.at(this.kernel.zepToken.address).implementation())
      assert.equal(await this.appManager.getImplementation('Vouching'), await UpgradeabilityProxy.at(this.kernel.vouching.address).implementation())
    })
  })

  describe('callWithImplementations', function () {
    const implementations = { Kernel: MockKernelV2 }

    beforeEach(async function () {
      this.appManager = await AppManagerDeployer.call(version, txParams)
      this.kernel = await KernelDeployer.callWithImplementations(this.appManager, newVersionConst, developerFraction, implementations, txParams)
    })

    it('deploys a new kernel instance', async function () {
      assert.equal(await this.kernel.zepToken.owner(), owner)
      assert.equal(await this.kernel.vouching.owner(), this.kernel.address())

      assert(newVersionConst.eq(await this.kernel.newVersionCost()))
      assert(developerFraction.eq(await this.kernel.developerFraction()))
    })

    it('uses the requested contracts implementations', async function () {
      const kernelV2 = await MockKernelV2.at(this.kernel.address());
      assert.equal(await kernelV2.testV2(), "v2")
    })

    it('uses the given app manager for the kernel', async function () {
      const appManager = KernelDeployer.appManager

      assert.equal(appManager, this.appManager)
      assert.equal(appManager.version, version)
      assert.equal(await appManager.getImplementation('Kernel'), await UpgradeabilityProxy.at(this.kernel.address()).implementation())
      assert.equal(await appManager.getImplementation('ZepToken'), await UpgradeabilityProxy.at(this.kernel.zepToken.address).implementation())
      assert.equal(await appManager.getImplementation('Vouching'), await UpgradeabilityProxy.at(this.kernel.vouching.address).implementation())
    })
  })
})
