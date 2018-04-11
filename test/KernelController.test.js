import Deployer from '../deploy/objects/Deployer';
import ZepCoreManager from "../deploy/objects/ZepCoreManager";
import ProjectControllerManager from "../deploy/objects/ProjectControllerManager";

const PickACard = artifacts.require('PickACard');
const ERC721Token = artifacts.require('ERC721Token');

const should = require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('KernelController', ([_, zeppelin, developer, someone, anotherone]) => {
  const version_180 = '1.8.0';
  const zeppelinDistro = 'Zeppelin';
  const erc721Name = 'ERC721Token';
  const newVersionCost = 2;
  const developerFraction = 10;

  beforeEach(async function () {
    // deploy ZepCore instance
    const deployed = await Deployer.zepCore(zeppelin, newVersionCost, developerFraction);
    this.zepCore = deployed.zepCore;

    // register a new kernel instance
    const zepCoreManager = new ZepCoreManager(this.zepCore, zeppelin)
    await zepCoreManager.mintZepTokens(developer, newVersionCost)
    await zepCoreManager.registerKernelInstance(zeppelinDistro, version_180, ERC721Token, erc721Name, developer)

    // deploy a project controller using zos
    const controller = await Deployer.projectController(someone, 'My Project', this.zepCore.address)
    this.controllerManager = new ProjectControllerManager(controller, someone);
    const erc721Proxy = await this.controllerManager.createProxy(ERC721Token, erc721Name, zeppelinDistro, version_180)
    this.mock = await PickACard.new(erc721Proxy.address);
  });

  it('uses the selected zos kernel instance', async function () {
    await this.mock.pick(5, { from: someone });

    const erc721 = ERC721Token.at(await this.mock.erc721())
    await erc721.transferFrom(someone, anotherone, 5, { from: someone })
    const owner = await erc721.ownerOf(5);

    assert.equal(owner, anotherone);
  });

  it('should not allow picking the same number twice', async function () {
    await this.mock.pick(5, { from: someone });
    await this.mock.pick(5, { from: anotherone }).should.be.rejected;
  });

  describe('when creating another instance of the testing contract', function () {
    beforeEach(async function () {
      this.anotherERC721Proxy = await this.controllerManager.createProxy(ERC721Token, erc721Name, zeppelinDistro, version_180)
      this.anotherMock = await PickACard.new(this.anotherERC721Proxy.address);
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
      //fetch the owner of token 5, in `mapping (uint256 => address) internal tokenOwner;`
      const ind = '0000000000000000000000000000000000000000000000000000000000000000' // tokenOwner position in storage
      const key = '0000000000000000000000000000000000000000000000000000000000000007' // tokenId
      const newkey = web3.sha3(key + ind, { encoding: "hex" })

      await this.anotherMock.pick(7, { from: someone });
      const storage = await web3.eth.getStorageAt(this.anotherERC721Proxy.address, newkey);
      assert.equal(storage, someone);
    });
  });
});
