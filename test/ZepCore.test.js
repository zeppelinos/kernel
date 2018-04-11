import Deployer from '../deploy/objects/Deployer';
import RegistryManager from '../deploy/objects/RegistryManager';

const BigNumber = web3.BigNumber;
const MockZepCoreV2 = artifacts.require('MockZepCoreV2');
const KernelInstance = artifacts.require('KernelInstance');

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('ZepCore', ([_, owner, developer, user, anotherDeveloper]) => {
  const newVersionCost = 2;
  const developerFraction = 10;

  beforeEach(async function () {
    // deploy ZepCore instance
    const deployed = await Deployer.zepCore(owner, newVersionCost, developerFraction)
    Object.assign(this, deployed)

    // deploy a new kernel instances
    const name = "Zeppelin";
    this.kernelInstance = await KernelInstance.new(name, "0.1", 0, { from: developer });
    this.anotherKernelInstance = await KernelInstance.new(name, "0.2", 0, { from: anotherDeveloper });

    // mint ZEP tokens
    await this.zepToken.mint(user, 1000, { from: owner });
    await this.zepToken.mint(developer, 100, { from: owner });
    await this.zepToken.approve(this.zepCore.address, 100, { from: developer });
  });

  it('has a ZepToken', async function () {
    const tokenAddress = await this.zepCore.token();
    assert.equal(tokenAddress, this.zepToken.address);
    assert.equal(await this.zepToken.name(), "Zep Token");
    assert.equal(await this.zepToken.symbol(), "ZEP");
    assert.equal(await this.zepToken.decimals(), 18);
  });

  it('registers instances', async function () {
    await this.zepCore.register(this.kernelInstance.address, { from: developer }).should.be.fulfilled;
  });

  it('should accept stakes', async function () {
    const stakeValue = 42;
    const effectiveStake = stakeValue - Math.floor(stakeValue/developerFraction);
    await this.zepToken.approve(this.zepCore.address, stakeValue, { from: user });
    await this.zepCore.stake(this.kernelInstance.address, stakeValue, 0, { from: user });
    
    const staked = await this.kernelStakes.totalStakedFor(this.kernelInstance.address);
    staked.should.be.bignumber.equal(effectiveStake);
    const totalStaked = await this.kernelStakes.totalStaked();
    totalStaked.should.be.bignumber.equal(effectiveStake);
  });

  it('should accept unstakes', async function () {
    const stakeValue = 42;
    const unstakeValue = 24;
    const effectiveStake = stakeValue-Math.floor(stakeValue/developerFraction)-unstakeValue;
    await this.zepToken.approve(this.zepCore.address, stakeValue, { from: user });
    await this.zepCore.stake(this.kernelInstance.address, stakeValue, 0, { from: user });
    await this.zepCore.unstake(this.kernelInstance.address, unstakeValue, 0, { from: user });
    
    const staked = await this.kernelStakes.totalStakedFor(this.kernelInstance.address);
    staked.should.be.bignumber.equal(effectiveStake);
    const totalStaked = await this.kernelStakes.totalStaked();
    totalStaked.should.be.bignumber.equal(effectiveStake);
  });

  it('should transfer stakes', async function () {
    const stakeValue = 420;
    const transferValue = 20;
    const effectiveStakeFirst = stakeValue - Math.floor(stakeValue/developerFraction) - transferValue;
    const effectiveStakeSecond = transferValue - Math.floor(transferValue/developerFraction);
    const totalEffectivelyStaked = effectiveStakeFirst+effectiveStakeSecond;

    await this.zepToken.approve(this.zepCore.address, stakeValue, { from: user });
    await this.zepCore.stake(this.kernelInstance.address, stakeValue, 0, { from: user });
    await this.zepCore.transferStake(this.kernelInstance.address, this.anotherKernelInstance.address, transferValue, 0, { from: user });

    const stakedToFirst = await this.kernelStakes.totalStakedFor(this.kernelInstance.address);
    stakedToFirst.should.be.bignumber.equal(effectiveStakeFirst);

    const stakedToSecond = await this.kernelStakes.totalStakedFor(this.anotherKernelInstance.address);
    stakedToSecond.should.be.bignumber.equal(effectiveStakeSecond);

    const totalStaked = await this.kernelStakes.totalStaked();
    totalStaked.should.be.bignumber.equal(totalEffectivelyStaked);
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
