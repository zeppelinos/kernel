import assertRevert from './helpers/assertRevert';
import Deployer from '../deploy/objects/Deployer';
import RegistryManager from '../deploy/objects/RegistryManager';

const decodeLogs = require('./helpers/decodeLogs');

const BigNumber = web3.BigNumber;
const MockZepCoreV2 = artifacts.require('MockZepCoreV2');
const KernelInstance = artifacts.require('KernelInstance');
const KernelStakes = artifacts.require('KernelStakes');

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('ZepCore', ([_, owner, developer, user, anotherDeveloper, anotherUser, implementationAddress]) => {
  const newVersionCost = 2;
  const developerFraction = 10;
  const instanceName = "Zeppelin";
  const instanceVersion1 = "0.1";
  const instanceVersion2 = "0.2";
  const someContractName = "SomeContract";

  beforeEach(async function () {
    const deployed = await Deployer.zepCore(owner, newVersionCost, developerFraction)
    Object.assign(this, deployed)
    this.kernelInstance = await KernelInstance.new(instanceName, instanceVersion1, 0, { from: developer });
    this.anotherKernelInstance = await KernelInstance.new(instanceName, instanceVersion2, 0, { from: anotherDeveloper });
    await this.zepToken.mint(owner, 10000, { from: owner });
  });

  it('has a ZepToken', async function () {
    const tokenAddress = await this.zepCore.token();
    assert.equal(tokenAddress, this.zepToken.address);
    assert.equal(await this.zepToken.name(), "Zep Token");
    assert.equal(await this.zepToken.symbol(), "ZEP");
    assert.equal(await this.zepToken.decimals(), 18);
  });

  describe.only('working with instances', function () {
    const instanceVersion3 = "0.3";

    beforeEach(async function () {
      await this.zepToken.transfer(developer, newVersionCost, { from: owner });
      await this.zepToken.approve(this.zepCore.address, newVersionCost, { from: developer });
      await this.kernelInstance.addImplementation(someContractName, implementationAddress, { from: developer });
      await this.zepCore.register(this.kernelInstance.address, { from: developer });
    });
  
    it('should get instances', async function () {
      const instanceAddress = await this.zepCore.getInstance(instanceName, instanceVersion1);
      assert.equal(instanceAddress, this.kernelInstance.address);
    });

    it('should return 0 address for unregistered instances', async function (){
      const unregisteredInstance = await this.zepCore.getInstance(instanceName, instanceVersion2);
      assert.equal(unregisteredInstance, 0);
    });

    it('should get implementations', async function () {
      const implementation = await this.zepCore.getImplementation(instanceName, instanceVersion1, someContractName);
      assert.equal(implementation, implementationAddress);
    });

    it('should get instance hash', async function () {
      const instanceAddress = await this.zepCore.getInstance(instanceName, instanceVersion1);
      const instance = KernelInstance.at(instanceAddress);
      const instance_hash = await instance.getHash();
      const hash = web3.sha3(instanceName.concat(instanceVersion1));
      assert.equal(instance_hash, hash);   
    });

    it('should resort to parent implementation if none availabe in child', async function () {
      await this.kernelInstance.freeze({ from: developer });
      this.derivedKernelInstance = await KernelInstance.new(instanceName, instanceVersion3, this.kernelInstance.address, { from: anotherDeveloper });
      await this.zepToken.transfer(anotherDeveloper, newVersionCost, { from: owner });
      await this.zepToken.approve(this.zepCore.address, newVersionCost, { from: anotherDeveloper });
      await this.zepCore.register(this.derivedKernelInstance.address, { from: anotherDeveloper });
      const implementation = await this.zepCore.getImplementation(instanceName, instanceVersion3, someContractName);
      assert.equal(implementation, implementationAddress);
    });
  });

  describe('staking', function() {
    const stakeValue = 42;
    const unstakeValue = 24;
    const transferValue = 10;
    const tooSmallStake = developerFraction - 1; 

    describe('registered instances', function() {
      
      beforeEach(async function () {
        await this.zepToken.transfer(developer, newVersionCost, { from: owner });
        await this.zepToken.transfer(anotherDeveloper, newVersionCost, { from: owner });
        await this.zepToken.approve(this.zepCore.address, newVersionCost, { from: developer });
        await this.zepToken.approve(this.zepCore.address, newVersionCost, { from: anotherDeveloper });
        await this.zepCore.register(this.kernelInstance.address, { from: developer });
        await this.zepCore.register(this.anotherKernelInstance.address, { from: anotherDeveloper });

        await this.zepToken.transfer(user, stakeValue, { from: owner });
        await this.zepToken.approve(this.zepCore.address, stakeValue, { from: user });
      });

      describe('stakes', async function () {
        beforeEach(async function () {
          const { receipt } = await this.zepCore.stake(this.kernelInstance.address, stakeValue, 0, { from: user });
          this.receipt = receipt;
          this.totalStakedFor = await this.kernelStakes.totalStakedFor(this.kernelInstance.address);
        })

        it('should accept stakes', async function () {
          const effectiveStake = stakeValue - Math.floor(stakeValue/developerFraction);
          this.totalStakedFor.should.be.bignumber.equal(effectiveStake);
          const totalStaked = await this.kernelStakes.totalStaked();
          totalStaked.should.be.bignumber.equal(effectiveStake);
        });
        
        it('should emit a Staked event with correct amount', async function () {
          this.logs = decodeLogs([this.receipt.logs[1]], KernelStakes, this.kernelStakes.address);
          const total = this.logs.find(l => l.event === 'Staked').args.total;
          this.totalStakedFor.should.be.bignumber.equal(total);
        });

        it('should reject stakes that result in no payout to dev', async function () {
          await assertRevert(this.zepCore.stake(this.kernelInstance.address, tooSmallStake, 0, { from: user }));
        });
      });

      describe('unstakes', function () {
        describe('when the staker had some stake', function () {
          beforeEach(async function () {
            await this.zepCore.stake(this.kernelInstance.address, stakeValue, 0, { from: user });
          });
  
          describe('when the requested amount is lower than the staked amount', function () {
            const effectiveStake = stakeValue - Math.floor(stakeValue/developerFraction) - unstakeValue;
            beforeEach(async function () {
              const { receipt } = await this.zepCore.unstake(this.kernelInstance.address, unstakeValue, 0, { from: user });
              this.receipt = receipt;
            })

            it('unstakes the requested amount', async function () {
              const staked = await this.kernelStakes.totalStakedFor(this.kernelInstance.address);
              staked.should.be.bignumber.equal(effectiveStake);
              const totalStaked = await this.kernelStakes.totalStaked();
              totalStaked.should.be.bignumber.equal(effectiveStake);
            });
        
            it('should emit an Unstaked event with correct amount', async function () {
              this.logs = decodeLogs([this.receipt.logs[0]], KernelStakes, this.kernelStakes.address);
              const total = this.logs.find(l => l.event === 'Unstaked').args.total;
              total.should.be.bignumber.equal(effectiveStake);
            });
          });

          describe('when the requested amount is higher than the staked amount', function () {
            it('reverts', async function () {
              const tooHighUnstake = stakeValue + 1;
              await assertRevert(this.zepCore.unstake(this.kernelInstance.address, tooHighUnstake, 0, { from: user}));
            });
          });
        });
        
        describe('when the staker had no stake', function () {
          it('reverts', async function () {
            await assertRevert(this.zepCore.unstake(this.kernelInstance.address, unstakeValue, 0, { from: user }));
          });
        });
      });

      describe('transfers', function () {
        it('should transfer stakes', async function () {
          const effectiveStakeFirst = stakeValue - Math.floor(stakeValue/developerFraction) - transferValue;
          const effectiveStakeSecond = transferValue - Math.floor(transferValue/developerFraction);
          const totalEffectivelyStaked = effectiveStakeFirst + effectiveStakeSecond;

          await this.zepCore.stake(this.kernelInstance.address, stakeValue, 0, { from: user });
          await this.zepCore.transferStake(this.kernelInstance.address, this.anotherKernelInstance.address, transferValue, 0, { from: user });

          const stakedToFirst = await this.kernelStakes.totalStakedFor(this.kernelInstance.address);
          stakedToFirst.should.be.bignumber.equal(effectiveStakeFirst);

          const stakedToSecond = await this.kernelStakes.totalStakedFor(this.anotherKernelInstance.address);
          stakedToSecond.should.be.bignumber.equal(effectiveStakeSecond);

          const totalStaked = await this.kernelStakes.totalStaked();
          totalStaked.should.be.bignumber.equal(totalEffectivelyStaked);
        });
      });

      describe('restakes', function (){
        const anotherStake = 47;
        const effectiveStake = stakeValue - Math.floor(stakeValue/developerFraction) + anotherStake - Math.floor(anotherStake/developerFraction);        

        beforeEach(async function () {
          await this.zepCore.stake(this.kernelInstance.address, stakeValue, 0, { from: user });
        });

        it('should accept more than one stake to the same instance by the same user', async function() {
          await this.zepToken.transfer(user, anotherStake, { from: owner });
          await this.zepToken.approve(this.zepCore.address, anotherStake, { from: user });
          await this.zepCore.stake(this.kernelInstance.address, anotherStake, 0, { from: user });
          
          const staked = await this.kernelStakes.totalStakedFor(this.kernelInstance.address);
          staked.should.be.bignumber.equal(effectiveStake);       
        });

        it('should accept more than one stake to the same instance by different users', async function() {
          await this.zepToken.transfer(anotherUser, anotherStake, { from: owner });
          await this.zepToken.approve(this.zepCore.address, anotherStake, { from: anotherUser });
          await this.zepCore.stake(this.kernelInstance.address, anotherStake, 0, { from: anotherUser });
          
          const staked = await this.kernelStakes.totalStakedFor(this.kernelInstance.address);
          staked.should.be.bignumber.equal(effectiveStake);
        });
      });
    });

    describe('unregistered instances', function() {
      beforeEach(async function () {
        await this.zepToken.transfer(developer, newVersionCost, { from: owner });
        await this.zepToken.transfer(anotherDeveloper, newVersionCost, { from: owner });
        await this.zepToken.approve(this.zepCore.address, newVersionCost, { from: developer });
        await this.zepToken.approve(this.zepCore.address, newVersionCost, { from: anotherDeveloper });

        await this.zepToken.transfer(user, stakeValue, { from: owner });
        await this.zepToken.approve(this.zepCore.address, stakeValue, { from: user });
      });

      it('should reject stakes', async function () {
        await assertRevert(this.zepCore.stake(this.kernelInstance.address, stakeValue, 0, { from: user }));
      });

      it('should reject unstakes', async function () {
        await assertRevert(this.zepCore.unstake(this.kernelInstance.address, unstakeValue, 0, { from: user }));
      });

      it('should reject stake transfers', async function () {
        await this.zepCore.register(this.kernelInstance.address, { from: developer });
        await this.zepCore.stake(this.kernelInstance.address, stakeValue, 0, { from: user });
        await assertRevert(this.zepCore.transferStake(this.kernelInstance.address, this.anotherKernelInstance.address, transferValue, 0, { from: user }));
      });
    });
  });

  describe('core upgradeability', function () {
    beforeEach(async function () {
      const registryManager = new RegistryManager(this.registry);
      await registryManager.deployAndRegister(MockZepCoreV2, 'ZepCore', '1');
      await this.controller.upgradeTo(this.zepCore.address, 'ZeppelinOS', '1', 'ZepCore', { from: owner });
    });

    it('should duplicate payout', async function () {
      const stakeValue = 42;
      const developerPayout = Math.floor(stakeValue / developerFraction) * 2;
      const effectiveStake = stakeValue - developerPayout;
      const developerBalanceBefore = await this.zepToken.balanceOf(developer);

      await this.zepToken.transfer(developer, newVersionCost, { from: owner });
      await this.zepToken.approve(this.zepCore.address, newVersionCost, { from: developer });
      await this.zepCore.register(this.kernelInstance.address, { from: developer });

      await this.zepToken.transfer(user, stakeValue, { from: owner });
      await this.zepToken.approve(this.zepCore.address, stakeValue, { from: user });
      await this.zepCore.stake(this.kernelInstance.address, stakeValue, 0, { from: user });

      const staked = await this.kernelStakes.totalStakedFor(this.kernelInstance.address);
      staked.should.be.bignumber.equal(effectiveStake);
      const totalStaked = await this.kernelStakes.totalStaked();
      totalStaked.should.be.bignumber.equal(effectiveStake);

      const developerBalanceAfter = await this.zepToken.balanceOf(developer);
      developerBalanceAfter.should.be.bignumber.equal(developerBalanceBefore.plus(developerPayout));
    });
  });
});
