import assertRevert from "./helpers/assertRevert";

const Vouching = artifacts.require('Vouching');
const shouldBehaveLikeOwnable = require('zos-core/test/ownership/Ownable.behavior');

contract('Vouching', ([_, vouchOwner, someone, anotherone, instance]) => {

  beforeEach(async function () {
    this.vouching = await Vouching.new({ from: vouchOwner })
  })

  describe('ownership', function () {
    beforeEach(function () {
      this.ownable = this.vouching
    })

    shouldBehaveLikeOwnable(vouchOwner, someone)
  })

  describe('vouch', function () {
    const amount = 100

    describe('when the sender is the vouches owner', function () {
      const from = vouchOwner

      it('vouches the requested amount', async function () {
        await this.vouching.vouch(someone, instance, amount, '', { from })
        const vouch = await this.vouching.vouchedFor(someone, instance)
        const totalVouch = await this.vouching.totalVouched()
        const totalInstanceVouch = await this.vouching.totalVouchedFor(instance)

        assert(vouch.eq(amount))
        assert(totalVouch.eq(amount))
        assert(totalInstanceVouch.eq(amount))
      })

      it('emits an Vouched event', async function () {
        const { logs } = await this.vouching.vouch(someone, instance, amount, 123, { from })
        const totalInstanceVouch = await this.vouching.totalVouchedFor(instance)

        assert.equal(logs.length, 1)
        assert.equal(logs[0].event, 'Vouched')
        assert.equal(logs[0].args.data, 123)
        assert.equal(logs[0].args.amount, amount)
        assert.equal(logs[0].args.voucher, someone)
        assert.equal(logs[0].args.release, instance)
        assert(logs[0].args.total.eq(totalInstanceVouch))
      })

      describe('when the voucher had already Vouched for the same instance before', function () {
        const previousVouch = 100

        beforeEach(async function () {
          await this.vouching.vouch(someone, instance, previousVouch, '', { from })
        })

        it('add the requested amount to the current vouch', async function () {
          await this.vouching.vouch(someone, instance, amount, '', { from })
          const vouch = await this.vouching.vouchedFor(someone, instance)
          const totalVouch = await this.vouching.totalVouched()
          const totalInstanceVouch = await this.vouching.totalVouchedFor(instance)

          assert(vouch.eq(previousVouch + amount))
          assert(totalVouch.eq(previousVouch + amount))
          assert(totalInstanceVouch.eq(previousVouch + amount))
        })
      })

      describe('when another voucher had already Vouched for the same instance before', function () {
        const previousVouch = 100

        beforeEach(async function () {
          await this.vouching.vouch(anotherone, instance, previousVouch, '', { from })
        })

        it('add the requested amount to the current vouch', async function () {
          await this.vouching.vouch(someone, instance, amount, '', { from })
          const vouch = await this.vouching.vouchedFor(someone, instance)
          const totalVouch = await this.vouching.totalVouched()
          const totalInstanceVouch = await this.vouching.totalVouchedFor(instance)

          assert(vouch.eq(amount))
          assert(totalVouch.eq(previousVouch + amount))
          assert(totalInstanceVouch.eq(previousVouch + amount))
        })
      })
    })

    describe('when the sender is not the vouches owner', function () {
      const from = someone

      it('reverts', async function () {
        await assertRevert(this.vouching.vouch(someone, instance, amount, '', { from }))
      })
    })
  })

  describe('unvouch', function () {
    describe('when the sender is the vouches owner', function () {
      const from = vouchOwner

      describe('when the voucher had some vouch', function () {
        const vouch = 100

        beforeEach(async function () {
          await this.vouching.vouch(someone, instance, vouch, '', { from })
        })

        describe('when the requested amount is lower than the Vouched amount', function () {
          const amount = vouch - 1

          it('unvouches the requested amount', async function () {
            const previousVouch = await this.vouching.vouchedFor(someone, instance)
            const previousTotalVouch = await this.vouching.totalVouched()
            const previousTotalInstanceVouch = await this.vouching.totalVouchedFor(instance)

            await this.vouching.unvouch(someone, instance, amount, '', { from })
            const vouch = await this.vouching.vouchedFor(someone, instance)
            const totalVouch = await this.vouching.totalVouched()
            const totalInstanceVouch = await this.vouching.totalVouchedFor(instance)

            assert(vouch.eq(previousVouch.minus(amount)))
            assert(totalVouch.eq(previousTotalVouch.minus(amount)))
            assert(totalInstanceVouch.eq(previousTotalInstanceVouch.minus(amount)))
          })

          it('emits an Unvouched event', async function () {
            const { logs } = await this.vouching.unvouch(someone, instance, amount, 123, { from })
            const totalInstanceVouch = await this.vouching.totalVouchedFor(instance)

            assert.equal(logs.length, 1)
            assert.equal(logs[0].event, 'Unvouched')
            assert.equal(logs[0].args.data, 123)
            assert.equal(logs[0].args.amount, amount)
            assert.equal(logs[0].args.voucher, someone)
            assert.equal(logs[0].args.release, instance)
            assert(logs[0].args.total.eq(totalInstanceVouch))
          })
        })

        describe('when the requested amount is higher than the Vouched amount', function () {
          const amount = vouch + 1

          it('reverts', async function () {
            await assertRevert(this.vouching.unvouch(someone, instance, amount, '', { from }))
          })
        })
      })

      describe('when the voucher did not vouch before', function () {
        it('reverts', async function () {
          await assertRevert(this.vouching.unvouch(someone, instance, 100, '', { from }))
        })
      })
    })

    describe('when the sender is not the vouches owner', function () {
      const amount = 100
      const from = someone

      it('reverts', async function () {
        await this.vouching.vouch(someone, instance, amount, '', { from: vouchOwner })
        await assertRevert(this.vouching.unvouch(someone, instance, amount, '', { from }))
      })
    })
  })
})
