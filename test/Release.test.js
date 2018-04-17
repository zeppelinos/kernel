import assertRevert from './helpers/assertRevert';
const Release = artifacts.require('Release');

require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('Release', ([developer, implementationAddress1, implementationAddress2]) => {
  const contractName = "TestContract";
  const anotherContractName = "AnotherContract";
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach("initializing a new release", async function () {
    this.release = await Release.new();
  });

  it('stores developer', async function () {
    const instanceDeveloper = await this.release.developer();
    instanceDeveloper.should.eq(developer);
  });

  it('starts unfrozen', async function () {
    const frozen = await this.release.frozen();      
    frozen.should.be.false;
  });

  it('should return 0 if no implementation', async function () {
    const instanceImplementation1 = await this.release.getImplementation(contractName);
    instanceImplementation1.should.eq(ZERO_ADDRESS);
  })

  describe('adding implementations', async function () {
    
    beforeEach(async function () {
      this.receipt = await this.release.setImplementation(contractName, implementationAddress1);
    });

    it.skip('emits correct event', async function () {
      assert.equal(this.receipt.logs.length, 1); //Make sure there is a single event
      const event = this.receipt.logs.find(e => e.event === 'ImplementationAdded');
      assert.equal(event.args.contractName, contractName);
      assert.equal(event.args.implementation, implementationAddress1);
    });

    it('returns correct address', async function () {
      const instanceImplementation1 = await this.release.getImplementation(contractName);
      assert.equal(instanceImplementation1, implementationAddress1);
    });

    it('should fail if frozen', async function () {
      await this.release.freeze();
      await assertRevert(this.release.setImplementation(anotherContractName, implementationAddress2));
    });

  });
});
