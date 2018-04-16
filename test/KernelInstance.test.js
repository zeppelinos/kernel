import assertRevert from './helpers/assertRevert';
const KernelInstance = artifacts.require('KernelInstance');

require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('KernelInstance', ([developer, implementationAddress1, implementationAddress2]) => {
  const contractName = "TestContract";
  const anotherContractName = "AnotherContract";

  beforeEach(async function () {
    this.kernelInstance = await KernelInstance.new();
  });

  it('stores developer', async function () {
    const instanceDeveloper = await this.kernelInstance.developer();
    instanceDeveloper.should.eq(developer);
  });

  it('starts unfrozen', async function () {
    const frozen = await this.kernelInstance.frozen();      
    frozen.should.be.false;
  });

  it('should return 0 if no implementation', async function () {
    const instanceImplementation1 = await this.kernelInstance.getImplementation(contractName);
    instanceImplementation1.should.eq('0x0000000000000000000000000000000000000000');
  })

  describe('adding implementations', async function () {
    
    beforeEach(async function () {
      this.receipt = await this.kernelInstance.addImplementation(contractName, implementationAddress1);
    });

    it('emits correct event', async function () {
      assert.equal(this.receipt.logs.length, 1); //Make sure there is a single event
      const event = this.receipt.logs.find(e => e.event === 'ImplementationAdded');
      assert.equal(event.args.contractName, contractName);
      assert.equal(event.args.implementation, implementationAddress1);
    });

    it('returns correct address', async function () {
      const instanceImplementation1 = await this.kernelInstance.getImplementation(contractName);
      assert.equal(instanceImplementation1, implementationAddress1);
    });

    it('should not add implementation for same contract twice', async function () {
      await assertRevert(this.kernelInstance.addImplementation(contractName, implementationAddress2));
    });

    it('should fail if frozen', async function () {
      await this.kernelInstance.freeze();
      await assertRevert(this.kernelInstance.addImplementation(anotherContractName, implementationAddress2));
    });

  });
});
