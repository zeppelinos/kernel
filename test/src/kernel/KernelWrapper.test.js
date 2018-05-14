import KernelDeployer from "../../../src/kernel/KernelDeployer"
import ReleaseDeployer from "../../../src/release/ReleaseDeployer"
import { assertRevert } from 'zos-lib'

const BigNumber = web3.BigNumber;

contract('KernelWrapper', ([_, kernelOwner, releaseOwner, voucherAddress]) => {
  const version = '0.0.1'
  const newVersionConst = new BigNumber('2e18')
  const developerFraction = new BigNumber(10)

  beforeEach('deploy kernel and release', async function () {
    this.kernel = await KernelDeployer.call(version, newVersionConst, developerFraction, { from: kernelOwner })
    this.release = await ReleaseDeployer.call([], { from: releaseOwner })
  })

  async function freezeAndRegisterRelease() {
    await this.release.freeze()
    await this.kernel.mintZepTokens(releaseOwner, newVersionConst)
    this.kernel.txParams = { from: releaseOwner }
    await this.kernel.register(this.release.address())
  }

  async function mintTokensAndVouchForRelease() {
    this.kernel.txParams = { from: kernelOwner }
    await this.kernel.mintZepTokens(voucherAddress, new BigNumber('10e18'))
    this.kernel.txParams = { from: voucherAddress }
    await this.kernel.vouch(this.release.address(), new BigNumber('10e18'))
  }

  it('has a zep token and a vouching contract', async function () {
    this.kernel.kernel.address.should.be.not.null
    this.kernel.zepToken.address.should.be.not.null
    this.kernel.vouching.address.should.be.not.null
  })

  it('has a new version cost and a developer fraction', async function () {
    const versionCost = await this.kernel.newVersionCost()
    const fraction = await this.kernel.developerFraction()

    versionCost.should.be.bignumber.eq(newVersionConst)
    fraction.should.be.bignumber.eq(developerFraction)
  })

  describe('register', function () {
    beforeEach('freeze and register release', freezeAndRegisterRelease)

    it('registers a given release', async function () {
      await this.kernel._ifRegisteredThrow(this.release.address(), 'error').should.be.rejectedWith('error')
    })
  })

  describe('vouch', function () {
    beforeEach('freeze and register release', freezeAndRegisterRelease)
    beforeEach('mint tokens and vouch for release', mintTokensAndVouchForRelease)

    it('accepts vouching a given amount', async function () {
      const vouchedAmount = await this.kernel.vouching.vouchedFor(voucherAddress, this.release.address())
      vouchedAmount.should.be.bignumber.equal('9e18')
    })
  })

  describe('unvouch', function () {
    beforeEach('freeze and register release', freezeAndRegisterRelease)
    beforeEach('mint tokens and vouch for release', mintTokensAndVouchForRelease)

    it('accepts unvouching a given amount', async function () {
      await this.kernel.unvouch(this.release.address(), new BigNumber('9e18'))
      const vouchedAmount = await this.kernel.vouching.vouchedFor(voucherAddress, this.release.address())
      vouchedAmount.should.be.bignumber.equal(0)
    })
  })

  describe('mintZepTokens', function () {
    describe('when the requester is the ZEP tokens owner', function () {
      it('mints the requested amount of tokens', async function () {
        await this.kernel.mintZepTokens(voucherAddress, 10)

        const balance = await this.kernel.zepToken.balanceOf(voucherAddress)
        balance.should.be.bignumber.equal(10)
      })
    })

    describe('when the requester is not the ZEP tokens owner', function () {
      it('reverts', async function () {
        this.kernel.txParams = { from: voucherAddress }
        await assertRevert(this.kernel.mintZepTokens(voucherAddress, 10))
      })
    })
  })

  describe('validateCanRegister', function () {
    it('throws if the requested release is not frozen', async function () {
      await this.kernel.validateCanRegister(this.release.address()).should.be.rejectedWith(`Given release ${this.release.address()} must be frozen to be registered.`)
    })

    it('throws if the requested release is already registered', async function () {
      await this.release.freeze()
      await this.kernel.mintZepTokens(releaseOwner, newVersionConst)
      this.kernel.txParams = { from: releaseOwner }
      await this.kernel.register(this.release.address())

      await this.kernel.validateCanRegister(this.release.address()).should.be.rejectedWith(`Given release ${this.release.address()} is already registered.`)
    })

    it('throws if the sender does not have enough tokens to register a release', async function () {
      await this.release.freeze()

      await this.kernel.validateCanRegister(this.release.address()).should.be.rejectedWith('You don\'t have enough ZEP tokens to register a new release')
    })

    it('does not throw otherwise', async function () {
      await this.release.freeze()
      await this.kernel.mintZepTokens(releaseOwner, newVersionConst)
      this.kernel.txParams = { from: releaseOwner }

      await this.kernel.validateCanRegister(this.release.address()).should.be.fulfilled
    })
  })

  describe('validateCanVouch', function () {
    beforeEach('freeze and register release', freezeAndRegisterRelease)

    beforeEach('mint ZEP tokens for voucher', async function() {
      this.kernel.txParams = { from: kernelOwner }
      await this.kernel.mintZepTokens(voucherAddress, new BigNumber('10e18'))
      this.kernel.txParams = { from: voucherAddress }
    })

    it('throws if the requested release is not registered', async function () {
      await this.kernel.validateCanVouch(0x0, new BigNumber(10)).should.be.rejectedWith('Given release 0 is not registered yet.')
    })

    it('throws if the sender does not have the requested vouching amount', async function () {
      await this.kernel.validateCanVouch(this.release.address(), new BigNumber('20e18')).should.be.rejectedWith('You don\'t have enough ZEP tokens to vouch given amount')
    })

    it('throws if the requested vouching amount does not reach the minimum developer payout', async function () {
      await this.kernel.validateCanVouch(this.release.address(), new BigNumber(1)).should.be.rejectedWith(`You have to vouch ${developerFraction} ZEP tokens at least.`)
    })

    it('does not throw otherwise', async function () {
      await this.kernel.validateCanVouch(this.release.address(), new BigNumber('10e18')).should.be.fulfilled
    })
  })

  describe('validateCanUnvouch', function () {
    beforeEach('freeze and register release', freezeAndRegisterRelease)
    beforeEach('mint tokens and vouch for release', mintTokensAndVouchForRelease)

    it('throws if the requested release is not registered', async function () {
      await this.kernel.validateCanUnvouch(0x0, 10, 'error').should.be.rejectedWith('Given release 0 is not registered yet.')
    })

    it('throws if the requested unvouching amount is not met', async function () {
      await this.kernel.validateCanUnvouch(this.release.address(), new BigNumber('10e18')).should.be.rejectedWith('You don\'t have enough vouched tokens to unvouch given amount.')
    })

    it('does not throw otherwise', async function () {
      await this.kernel.validateCanUnvouch(this.release.address(), new BigNumber('9e18')).should.be.fulfilled
    })
  })
})
