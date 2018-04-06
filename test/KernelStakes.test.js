import assertRevert from "./helpers/assertRevert";

const KernelStakes = artifacts.require('KernelStakes');
const shouldBehaveLikeOwnable = require('zos-core/test/ownership/Ownable.behavior');

contract('KernelStakes', ([_, stakeOwner, someone, anotherone, instance]) => {

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

      it('stakes the requested amount', async function () {
        await this.stakes.stake(someone, instance, amount, '', { from })
        const stake = await this.stakes.stakedFor(someone, instance)
        const totalStake = await this.stakes.totalStaked()
        const totalInstanceStake = await this.stakes.totalStakedFor(instance)

        assert(stake.eq(amount))
        assert(totalStake.eq(amount))
        assert(totalInstanceStake.eq(amount))
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

      describe('when the staker had already staked for the same instance before', function () {
        const previousStake = 100

        beforeEach(async function () {
          await this.stakes.stake(someone, instance, previousStake, '', { from })
        })

        it('add the requested amount to the current stake', async function () {
          await this.stakes.stake(someone, instance, amount, '', { from })
          const stake = await this.stakes.stakedFor(someone, instance)
          const totalStake = await this.stakes.totalStaked()
          const totalInstanceStake = await this.stakes.totalStakedFor(instance)

          assert(stake.eq(previousStake + amount))
          assert(totalStake.eq(previousStake + amount))
          assert(totalInstanceStake.eq(previousStake + amount))
        })
      })

      describe('when another staker had already staked for the same instance before', function () {
        const previousStake = 100

        beforeEach(async function () {
          await this.stakes.stake(anotherone, instance, previousStake, '', { from })
        })

        it('add the requested amount to the current stake', async function () {
          await this.stakes.stake(someone, instance, amount, '', { from })
          const stake = await this.stakes.stakedFor(someone, instance)
          const totalStake = await this.stakes.totalStaked()
          const totalInstanceStake = await this.stakes.totalStakedFor(instance)

          assert(stake.eq(amount))
          assert(totalStake.eq(previousStake + amount))
          assert(totalInstanceStake.eq(previousStake + amount))
        })
      })
    })

    describe('when the sender is not the stakes owner', function () {
      const from = someone

      it('reverts', async function () {
        await assertRevert(this.stakes.stake(someone, instance, amount, '', { from }))
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

      describe('when the staker did not stake before', function () {
        it('reverts', async function () {
          await assertRevert(this.stakes.unstake(someone, instance, 100, '', { from }))
        })
      })
    })

    describe('when the sender is not the stakes owner', function () {
      const amount = 100
      const from = someone

      it('reverts', async function () {
        await this.stakes.stake(someone, instance, amount, '', { from: stakeOwner })
        await assertRevert(this.stakes.unstake(someone, instance, amount, '', { from }))
      })
    })
  })
})
