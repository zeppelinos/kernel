import assertRevert from "./helpers/assertRevert";

const KernelStakes = artifacts.require('KernelStakes');
const shouldBehaveLikeOwnable = require('zos-core/test/ownership/Ownable.behavior');

contract('KernelStakes', ([_, stakeOwner, someone, instance]) => {

  beforeEach(async function () {
    this.stakes = await KernelStakes.new({ from: stakeOwner })
  })

  describe('ownership', function () {
    beforeEach(function () {
      this.ownable = this.stakes
    })

    shouldBehaveLikeOwnable(stakeOwner, someone)
  })

  describe('stake', function () {
    const amount = 100

    describe('when the sender is the stakes owner', function () {
      const from = stakeOwner

      it('unstakes the requested amount', async function () {
        const previousStake = await this.stakes.stakedFor(someone, instance)
        const previousTotalStake = await this.stakes.totalStaked()
        const previousTotalInstanceStake = await this.stakes.totalStakedFor(instance)

        await this.stakes.stake(someone, instance, amount, '', { from })
        const stake = await this.stakes.stakedFor(someone, instance)
        const totalStake = await this.stakes.totalStaked()
        const totalInstanceStake = await this.stakes.totalStakedFor(instance)

        assert(stake.eq(previousStake.plus(amount)))
        assert(totalStake.eq(previousTotalStake.plus(amount)))
        assert(totalInstanceStake.eq(previousTotalInstanceStake.plus(amount)))
      })

      it('emits an Staked event', async function () {
        const { logs } = await this.stakes.stake(someone, instance, amount, 123, { from })
        const totalInstanceStake = await this.stakes.totalStakedFor(instance)

        assert.equal(logs.length, 1)
        assert.equal(logs[0].event, 'Staked')
        assert.equal(logs[0].args.data, 123)
        assert.equal(logs[0].args.amount, amount)
        assert.equal(logs[0].args.staker, someone)
        assert.equal(logs[0].args.instance, instance)
        assert(logs[0].args.total.eq(totalInstanceStake))
      })
    })

    describe('when the sender is not the stakes owner', function () {
      const from = someone

      it('reverts', async function () {
        await assertRevert(this.stakes.unstake(someone, instance, amount, '', { from }))
      })
    })
  })

  describe('unstake', function () {
    describe('when the sender is the stakes owner', function () {
      const from = stakeOwner

      describe('when the staker had some stake', function () {
        const stake = 100

        beforeEach(async function () {
          await this.stakes.stake(someone, instance, stake, '', { from })
        })

        describe('when the requested amount is lower than the staked amount', function () {
          const amount = stake - 1

          it('unstakes the requested amount', async function () {
            const previousStake = await this.stakes.stakedFor(someone, instance)
            const previousTotalStake = await this.stakes.totalStaked()
            const previousTotalInstanceStake = await this.stakes.totalStakedFor(instance)

            await this.stakes.unstake(someone, instance, amount, '', { from })
            const stake = await this.stakes.stakedFor(someone, instance)
            const totalStake = await this.stakes.totalStaked()
            const totalInstanceStake = await this.stakes.totalStakedFor(instance)

            assert(stake.eq(previousStake.minus(amount)))
            assert(totalStake.eq(previousTotalStake.minus(amount)))
            assert(totalInstanceStake.eq(previousTotalInstanceStake.minus(amount)))
          })

          it('emits an Unstaked event', async function () {
            const { logs } = await this.stakes.unstake(someone, instance, amount, 123, { from })
            const totalInstanceStake = await this.stakes.totalStakedFor(instance)

            assert.equal(logs.length, 1)
            assert.equal(logs[0].event, 'Unstaked')
            assert.equal(logs[0].args.data, 123)
            assert.equal(logs[0].args.amount, amount)
            assert.equal(logs[0].args.staker, someone)
            assert.equal(logs[0].args.instance, instance)
            assert(logs[0].args.total.eq(totalInstanceStake))
          })
        })

        describe('when the requested amount is higher than the staked amount', function () {
          const amount = stake + 1

          it('reverts', async function () {
            await assertRevert(this.stakes.unstake(someone, instance, amount, '', { from }))
          })
        })
      })

      describe('when the staker did not have any stake', function () {
        it('reverts', async function () {
          await assertRevert(this.stakes.unstake(someone, instance, 100, '', { from }))
        })
      })
    })

    describe('when the sender is not the stakes owner', function () {
      const from = someone

      it('reverts', async function () {
        await assertRevert(this.stakes.unstake(someone, instance, 100, '', { from }))
      })
    })
  })
})
