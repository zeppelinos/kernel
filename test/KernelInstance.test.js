import assertRevert from './helpers/assertRevert';
const KernelInstance = artifacts.require('KernelInstance');
const shouldBehaveLikeOwnable = require('zos-core/test/ownership/Ownable.behavior');

require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('KernelInstance', ([_, developer, someone, implementation_address_1, implementation_address_2]) => {
  const name = "Test";
  const version_0 = "0.0";
  const contractName = "TestContract";
  const anotherContractName = "AnotherContract";

  beforeEach(async function () {
    this.kernelInstance = await KernelInstance.new(name, version_0, 0, { from: developer });
  });

  it('is initialized with correct parameters', async function () {
    const instance_name = await this.kernelInstance.name();
    const instance_version = await this.kernelInstance.version();
    const instance_developer = await this.kernelInstance.developer();

    assert.equal(instance_name, name);
    assert.equal(instance_version, version_0);
    assert.equal(instance_developer, developer);
  });

  it('returns correct hash', async function () {
    const instance_hash = await this.kernelInstance.getHash();
    const hash = web3.sha3(name.concat(version_0));

    assert.equal(instance_hash, hash);
  });

  describe('ownership', function () {
    beforeEach(function () {
      this.ownable = this.kernelInstance
    })

    shouldBehaveLikeOwnable(developer, someone)
  })

  describe('getImplementation', function () {
    it('should return 0 if no implementation', async function () {
      const instance_implementation_1 = await this.kernelInstance.getImplementation(contractName);
      assert.equal(instance_implementation_1, 0);
    })
  })

  describe('adding implementations', async function () {
    describe('when the given implementation is not the zero address', async function () {
      it('reverts', async function () {
        await assertRevert(this.kernelInstance.addImplementation(contractName, 0x0, { from: developer }));
      });
    })

    describe('when the sender is the owner', async function () {
      const from = developer

      describe('when the given implementation is not the zero address', async function () {
        beforeEach(async function () {
          this.receipt = await this.kernelInstance.addImplementation(contractName, implementation_address_1, { from });
        });

        it('emits correct event', async function () {
          assert.equal(this.receipt.logs.length, 1); //Make sure there is a single event
          const event = this.receipt.logs.find(e => e.event === 'ImplementationAdded');
          assert.equal(event.args.contractName, contractName);
          assert.equal(event.args.implementation, implementation_address_1);
        });

        it('returns correct address', async function () {
          const instance_implementation_1 = await this.kernelInstance.getImplementation(contractName);
          assert.equal(instance_implementation_1, implementation_address_1);
        });

        it('reverts when adding another implementation for the same contract', async function () {
          await assertRevert(this.kernelInstance.addImplementation(contractName, implementation_address_2, { from }));
        });

        it('should fail if frozen', async function () {
          await this.kernelInstance.freeze({ from });
          await assertRevert(this.kernelInstance.addImplementation(anotherContractName, implementation_address_2, { from }));
        });
      });
    });

    describe('when the sender is not the owner', function () {
      const from  = someone

      it('reverts', async function () {
        await assertRevert(this.kernelInstance.addImplementation(contractName, implementation_address_1, { from }));
      });
    })
  });

  describe('when it has a parent', async function () {
    const version_1 = "0.1";

    beforeEach(async function () {
      this.parentInstance = this.kernelInstance
    });

    describe('when the given parent is not frozen', function () {
      it('reverts', async function () {
        await assertRevert(KernelInstance.new(name, version_1, this.parentInstance.address));
      })
    })

    describe('when the given parent is frozen', function () {
      beforeEach(async function () {
        await this.parentInstance.addImplementation(contractName, implementation_address_1, { from: developer });
        await this.parentInstance.freeze({ from: developer });
        this.childInstance = await KernelInstance.new(name, version_1, this.parentInstance.address, { from: developer })
      })

      it('is initialized with correct parameters', async function () {
        const instance_name = await this.childInstance.name();
        const instance_version = await this.childInstance.version();
        const instance_developer = await this.childInstance.developer();
        const instance_parent = await this.childInstance.parent();

        assert.equal(instance_name, name);
        assert.equal(instance_version, version_1);
        assert.equal(instance_developer, developer);
        assert.equal(instance_parent, this.parentInstance.address);
      });

      it('should return parent implementation', async function () {
        const parentImplementation = await this.parentInstance.getImplementation(contractName);
        const childImplementation = await this.childInstance.getImplementation(contractName);

        assert.equal(childImplementation, parentImplementation);
      });

      it('can override a parent implementation', async function () {
        await this.childInstance.addImplementation(contractName, implementation_address_2, { from: developer })

        const parentImplementation = await this.parentInstance.getImplementation(contractName);
        const childImplementation = await this.childInstance.getImplementation(contractName);

        assert.notEqual(childImplementation, parentImplementation);
        assert.equal(childImplementation, implementation_address_2);
      });
    });
  });

  describe('freeze', function () {
    it('starts unfrozen', async function () {
      const frozen = await this.kernelInstance.frozen();

      assert.isFalse(frozen);
    });

    describe('after freezing it', function () {
      const from = developer

      beforeEach(async function () {
        await this.kernelInstance.freeze({ from });
      })

      it('is frozen', async function () {
        const frozen = await this.kernelInstance.frozen();
        assert(frozen);
      });

      it('cannot be re-frozen', async function () {
        await assertRevert(this.kernelInstance.freeze({ from }))
      });
    })

    describe('when the sender is not the owner', function () {
      const from = someone

      it('reverts', async function () {
        await assertRevert(this.kernelInstance.freeze({ from }));
      });
    })
  });
});
