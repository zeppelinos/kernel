import Deployer from '../deploy/objects/Deployer';

const decodeLogs = require('zos-lib').decodeLogs
const assertRevert = require('zos-lib').assertRevert;

const BigNumber = web3.BigNumber;
const Release = artifacts.require('Release');
const Vouching = artifacts.require('Vouching');
const MockKernelV2 = artifacts.require('MockKernelV2');

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('Kernel', ([_, owner, developer, user, anotherDeveloper, anotherUser]) => {
  const initialKernelVersion = "1.0";
  const newVersionCost = new BigNumber('2e18');
  const developerFraction = new BigNumber(10);

  beforeEach("deploying the kernel", async function () {
    this.deployer = new Deployer(owner)
    await this.deployer.initAppManager(initialKernelVersion);
    await this.deployer.registerKernelContractsInDirectory();
    const deployed = await this.deployer.deployKernel(newVersionCost, developerFraction);
    Object.assign(this, deployed)
  });

  beforeEach("creating a new release", async function () {
    this.release = await Release.new({ from: developer });
    await this.release.freeze({ from: developer });
    await this.zepToken.mint(owner, newVersionCost * 100, { from: owner });
  });

  it('has a ZepToken', async function () {
    const tokenAddress = await this.kernel.token();
    assert.equal(tokenAddress, this.zepToken.address);
    assert.equal(await this.zepToken.name(), "Zep Token");
    assert.equal(await this.zepToken.symbol(), "ZEP");
    assert.equal(await this.zepToken.decimals(), 18);
  });

  describe('registering', async function() {

    beforeEach(async function () {
      await this.zepToken.transfer(developer, newVersionCost * 5, { from: owner });
      await this.zepToken.approve(this.kernel.address, newVersionCost * 5, { from: developer });
      ({ logs: this.logs } = await this.kernel.register(this.release.address, { from: developer }));
    });

    it('should mark instance as registered', async function () {
      await this.kernel.isRegistered(this.release.address).should.eventually.be.true;
    });

    it('should emit an event on registration', async function () {
      this.logs.length.should.eq(1);
      const event = this.logs.find(e => e.event === 'ReleaseRegistered');
      should.exist(event);
      event.args.release.should.eq(this.release.address);
    });

    it('should burn tokens on registration', async function () {
      const balance = await this.zepToken.balanceOf(developer);
      balance.should.be.bignumber.equal(newVersionCost * 4);
      const totalSupply = await this.zepToken.totalSupply();
      totalSupply.should.be.bignumber.equal(newVersionCost * 99);
    });

    it('should not allow to register a release twice', async function () {
      await assertRevert(this.kernel.register(this.release.address, { from: developer }));
    });

    it('should not allow to register an unfrozen release', async function () {
      const unfrozenRelease = await Release.new({ from: developer });
      await assertRevert(this.kernel.register(unfrozenRelease.address, { from: developer }));
    });

  });

  describe('vouching', async function() {
    const vouchValue = new BigNumber('42e18');
    const unvouchValue = new BigNumber('24e18');
    const transferValue = new BigNumber('10e18');
    const tooSmallStake = developerFraction.minus(1);

    beforeEach("creating another release", async function () {
      this.anotherRelease = await Release.new({ from: anotherDeveloper });
      await this.anotherRelease.freeze({ from: anotherDeveloper });
    });

    describe('registered instances', async function() {
      
      beforeEach("registering instances", async function () {
        await this.zepToken.transfer(developer, newVersionCost, { from: owner });
        await this.zepToken.transfer(anotherDeveloper, newVersionCost, { from: owner });
        await this.zepToken.approve(this.kernel.address, newVersionCost, { from: developer });
        await this.zepToken.approve(this.kernel.address, newVersionCost, { from: anotherDeveloper });
        await this.kernel.register(this.release.address, { from: developer });
        await this.kernel.register(this.anotherRelease.address, { from: anotherDeveloper });
        await this.zepToken.transfer(user, vouchValue, { from: owner });
        await this.zepToken.approve(this.kernel.address, vouchValue, { from: user });
      });

      describe('vouches', async function () {
        beforeEach("vouching", async function () {
          const { receipt } = await this.kernel.vouch(this.release.address, vouchValue, 0, { from: user });
          this.receipt = receipt;
          this.totalVouchedFor = await this.vouching.totalVouchedFor(this.release.address);
        })

        it('should accept vouches', async function () {
          const effectiveVouching = vouchValue - Math.floor(vouchValue/developerFraction);
          this.totalVouchedFor.should.be.bignumber.equal(effectiveVouching);
          const totalVouched = await this.vouching.totalVouched();
          totalVouched.should.be.bignumber.equal(effectiveVouching);
        });
        
        it('should emit a Vouched event with correct amount', async function () {
          this.logs = decodeLogs([this.receipt.logs[1]], Vouching);
          const total = this.logs.find(l => l.event === 'Vouched').args.total;
          this.totalVouchedFor.should.be.bignumber.equal(total);
        });

        it('should reject vouches that result in no payout to dev', async function () {
          await assertRevert(this.kernel.vouch(this.release.address, tooSmallStake, 0, { from: user }));
        });
      });

      describe('unvouches', function () {
        describe('when the voucher had some vouch', function () {
          beforeEach(async function () {
            await this.kernel.vouch(this.release.address, vouchValue, 0, { from: user });
          });
  
          describe('when the requested amount is lower than the vouched amount', function () {
            const effectiveVouching = vouchValue - Math.floor(vouchValue/developerFraction) - unvouchValue;
            beforeEach(async function () {
              const { receipt } = await this.kernel.unvouch(this.release.address, unvouchValue, 0, { from: user });
              this.receipt = receipt;
            })

            it('unvouches the requested amount', async function () {
              const vouched = await this.vouching.totalVouchedFor(this.release.address);
              vouched.should.be.bignumber.equal(effectiveVouching);
              const totalVouched = await this.vouching.totalVouched();
              totalVouched.should.be.bignumber.equal(effectiveVouching);
            });
        
            it('should emit an Unvouched event with correct amount', async function () {
              this.logs = decodeLogs([this.receipt.logs[0]], Vouching);
              const total = this.logs.find(l => l.event === 'Unvouched').args.total;
              total.should.be.bignumber.equal(effectiveVouching);
            });
          });

          describe('when the requested amount is higher than the vouched amount', function () {
            it('reverts', async function () {
              const tooHighUnvouch = vouchValue.plus(1);
              await assertRevert(this.kernel.unvouch(this.release.address, tooHighUnvouch, 0, { from: user}));
            });
          });
        });
        
        describe('when the voucher had no vouch', function () {
          it('reverts', async function () {
            await assertRevert(this.kernel.unvouch(this.release.address, unvouchValue, 0, { from: user }));
          });
        });
      });

      describe('transfers', async function () {
        it('should transfer vouches', async function () {
          const effectiveVouchingFirst = vouchValue - Math.floor(vouchValue/developerFraction) - transferValue;
          const effectiveVouchingSecond = transferValue - Math.floor(transferValue/developerFraction);
          const totalEffectivelyVouched = effectiveVouchingFirst + effectiveVouchingSecond;

          await this.kernel.vouch(this.release.address, vouchValue, 0, { from: user });
          await this.kernel.transferStake(this.release.address, this.anotherRelease.address, transferValue, 0, { from: user });

          const vouchedToFirst = await this.vouching.totalVouchedFor(this.release.address);
          vouchedToFirst.should.be.bignumber.equal(effectiveVouchingFirst);

          const vouchedToSecond = await this.vouching.totalVouchedFor(this.anotherRelease.address);
          vouchedToSecond.should.be.bignumber.equal(effectiveVouchingSecond);

          const totalVouched = await this.vouching.totalVouched();
          totalVouched.should.be.bignumber.equal(totalEffectivelyVouched);
        });
      });

      describe('revouches', async function (){
        const anotherStake = new BigNumber('47e18');
        const effectiveVouching = vouchValue
          .plus(anotherStake)
          .minus(vouchValue.divToInt(developerFraction))
          .minus(anotherStake.divToInt(developerFraction));

        beforeEach(async function () {
          await this.kernel.vouch(this.release.address, vouchValue, 0, { from: user });
        });

        it('should accept more than one vouch to the same instance by the same user', async function() {
          await this.zepToken.transfer(user, anotherStake, { from: owner });
          await this.zepToken.approve(this.kernel.address, anotherStake, { from: user });
          await this.kernel.vouch(this.release.address, anotherStake, 0, { from: user });
          
          const vouched = await this.vouching.totalVouchedFor(this.release.address);
          vouched.should.be.bignumber.equal(effectiveVouching);       
        });

        it('should accept more than one vouch to the same instance by different users', async function() {
          await this.zepToken.transfer(anotherUser, anotherStake, { from: owner });
          await this.zepToken.approve(this.kernel.address, anotherStake, { from: anotherUser });
          await this.kernel.vouch(this.release.address, anotherStake, 0, { from: anotherUser });
          
          const vouched = await this.vouching.totalVouchedFor(this.release.address);
          vouched.should.be.bignumber.equal(effectiveVouching);
        });
      });
    });

    describe('unregistered instances', async function() {
      beforeEach(async function () {
        await this.zepToken.transfer(developer, newVersionCost, { from: owner });
        await this.zepToken.transfer(anotherDeveloper, newVersionCost, { from: owner });
        await this.zepToken.approve(this.kernel.address, newVersionCost, { from: developer });
        await this.zepToken.approve(this.kernel.address, newVersionCost, { from: anotherDeveloper });

        await this.zepToken.transfer(user, vouchValue, { from: owner });
        await this.zepToken.approve(this.kernel.address, vouchValue, { from: user });
      });

      it('should reject vouches', async function () {
        await assertRevert(this.kernel.vouch(this.release.address, vouchValue, 0, { from: user }));
      });

      it('should reject unvouches', async function () {
        await assertRevert(this.kernel.unvouch(this.release.address, unvouchValue, 0, { from: user }));
      });

      it('should reject vouch transfers', async function () {
        await this.kernel.register(this.release.address, { from: developer });
        await this.kernel.vouch(this.release.address, vouchValue, 0, { from: user });
        await assertRevert(this.kernel.transferStake(this.release.address, this.anotherRelease.address, transferValue, 0, { from: user }));
      });
    });
  });

  describe('kernel upgradeability', function () {
    const newVersion = "1.1";

    beforeEach('upgrading kernel', async function () {
      await this.deployer.addNewVersion(newVersion);
      await this.deployer.registerKernelContractsInDirectory({ Kernel: MockKernelV2 });
      await this.deployer.appManager.upgradeTo(this.kernel.address, 'Kernel', { from: owner });
    });

    it('should add new method', async function () {
      const kernelV2 = await MockKernelV2.at(this.kernel.address);
      await kernelV2.testV2().should.eventually.be.eq("v2");
    });

    it('should duplicate payout', async function () {
      const vouchValue = new BigNumber('42e18');
      const developerPayout = Math.floor(vouchValue / developerFraction) * 2;
      const effectiveVouching = vouchValue - developerPayout;
      const developerBalanceBefore = await this.zepToken.balanceOf(developer);

      await this.zepToken.transfer(developer, newVersionCost, { from: owner });
      await this.zepToken.approve(this.kernel.address, newVersionCost, { from: developer });
      await this.kernel.register(this.release.address, { from: developer });

      await this.zepToken.transfer(user, vouchValue, { from: owner });
      await this.zepToken.approve(this.kernel.address, vouchValue, { from: user });
      await this.kernel.vouch(this.release.address, vouchValue, 0, { from: user });

      const vouched = await this.vouching.totalVouchedFor(this.release.address);
      vouched.should.be.bignumber.equal(effectiveVouching);
      const totalVouched = await this.vouching.totalVouched();
      totalVouched.should.be.bignumber.equal(effectiveVouching);

      const developerBalanceAfter = await this.zepToken.balanceOf(developer);
      developerBalanceAfter.should.be.bignumber.equal(developerBalanceBefore.plus(developerPayout));
    });
  });
});