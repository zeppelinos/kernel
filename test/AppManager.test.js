import Deployer from '../deploy/objects/Deployer';
import AppManagerWrapper from '../deploy/objects/AppManagerWrapper';

const PickACard = artifacts.require('PickACard');
const ERC721Token = artifacts.require('ERC721Token');
const Release = artifacts.require('Release');
const AppContractDirectory = artifacts.require('AppContractDirectory');
const UnversionedAppManager = artifacts.require('UnversionedAppManager');
const UpgradeabilityProxyFactory = artifacts.require('UpgradeabilityProxyFactory');

const should = require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('AppManager', ([_, zeppelin, kernelDeveloper, appDeveloper, someone, anotherone]) => {
  const newVersionCost = 20;
  const developerFraction = 10;
  const initialKernelVersion = "1.0";

  beforeEach("deploying the kernel", async function () {
    this.deployer = new Deployer(zeppelin)
    await this.deployer.initAppManager(initialKernelVersion);
    await this.deployer.registerKernel();
    const deployed = await this.deployer.deployKernel(newVersionCost, developerFraction);
    Object.assign(this, deployed)
  });

  beforeEach("creating a new release with ERC721", async function () {
    this.release = await Release.new({ from: kernelDeveloper });
    const erc721Implementation = await ERC721Token.new({ from: kernelDeveloper });
    await this.release.setImplementation("ERC721", erc721Implementation.address, { from: kernelDeveloper });
    await this.release.freeze({ from: kernelDeveloper });
    
    await this.zepToken.mint(kernelDeveloper, newVersionCost * 10, { from: zeppelin });
    await this.zepToken.approve(this.kernel.address, newVersionCost, { from: kernelDeveloper })
    await this.kernel.register(this.release.address, { from: kernelDeveloper });
  });

  beforeEach("creating a new application", async function () {
    const provider = await AppContractDirectory.new(this.release.address, { from: appDeveloper });
    const pickACardImpl = await PickACard.new({ from: appDeveloper });
    await provider.setImplementation("PickACard", pickACardImpl.address, { from: appDeveloper });    
    
    const factory = await UpgradeabilityProxyFactory.new({ from: appDeveloper });
    this.appManager = await UnversionedAppManager.new(provider.address, factory.address, { from: appDeveloper });
    this.appManagerWrapper = new AppManagerWrapper(this.appManager, appDeveloper);
  });

  beforeEach("creating proxies for the application", async function () {
    const token = await this.appManagerWrapper.createProxy(ERC721Token, "ERC721", { from: appDeveloper });
    this.mock = await this.appManagerWrapper.createProxyAndCall(PickACard, "PickACard", ["address"], [token.address], { from: appDeveloper });
  });

  it('uses the selected zos kernel instance', async function () {
    await this.mock.pick(5, { from: someone });

    const erc721 = ERC721Token.at(await this.mock.erc721())
    await erc721.transferFrom(someone, anotherone, 5, { from: someone })
    await erc721.ownerOf(5).should.eventually.be.eq(anotherone);
  });

  it('should not allow picking the same number twice', async function () {
    await this.mock.pick(5, { from: someone });
    await this.mock.pick(5, { from: anotherone }).should.be.rejected;
  });

  describe('when creating another instance of the testing contract', function () {
    beforeEach(async function () {
      this.anotherToken = await this.appManagerWrapper.createProxy(ERC721Token, "ERC721", { from: appDeveloper })
      this.anotherMock = await this.appManagerWrapper.createProxyAndCall(PickACard, "PickACard", ["address"], [this.anotherToken.address], { from: appDeveloper });
    })

    it('creates different instances of the proxy', async function () {
      const ERC721 = ERC721Token.at(await this.mock.erc721())
      const anotherERC721 = ERC721Token.at(await this.anotherMock.erc721())

      assert.notEqual(ERC721.address, anotherERC721.address);
    });

    it('should allow picking the same number twice from independent instances', async function () {
      await this.mock.pick(5, { from: someone });
      await this.anotherMock.pick(5, { from: anotherone }).should.be.fulfilled;
    });

    it('storage takes place in KernelProxy', async function () {
      //fetch the zeppelin of token 5, in `mapping (uint256 => address) internal tokenOwner;`
      const ind = '0000000000000000000000000000000000000000000000000000000000000000' // tokenOwner position in storage
      const key = '0000000000000000000000000000000000000000000000000000000000000007' // tokenId
      const newkey = web3.sha3(key + ind, { encoding: "hex" })

      await this.anotherMock.pick(7, { from: someone });
      const storage = await web3.eth.getStorageAt(this.anotherToken.address, newkey);
      assert.equal(storage, someone);
    });
  });
});
