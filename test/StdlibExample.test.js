import KernelDeployer from '../src/kernel/KernelDeployer'
import ReleaseDeployer from '../src/release/ReleaseDeployer'
import { AppManagerDeployer } from 'zos-lib'

const PickACard = artifacts.require('PickACard');
const ERC721Token = artifacts.require('ERC721Token');
const Release = artifacts.require('Release');
const AppDirectory = artifacts.require('AppDirectory');
const UnversionedAppManager = artifacts.require('UnversionedAppManager');
const UpgradeabilityProxyFactory = artifacts.require('UpgradeabilityProxyFactory');

const should = require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('StdlibExample', ([_, zeppelin, kernelDeveloper, appDeveloper, someone, anotherone]) => {
  const newVersionCost = new web3.BigNumber('2e18');
  const developerFraction = new web3.BigNumber(10);
  const initialKernelVersion = "1.0";

  beforeEach("deploying the kernel with release including ERC721", async function () {
    const contracts = [{ name: "ERC721Token", alias: "ERC721" }]
    this.kernelWrapper = await KernelDeployer.call(initialKernelVersion, newVersionCost, developerFraction, { from: zeppelin })
    this.releaseWrapper = await ReleaseDeployer.call(contracts, { from: kernelDeveloper })
    await this.releaseWrapper.freeze()
    await this.kernelWrapper.mintZepTokens(kernelDeveloper, newVersionCost * 10)
    this.kernelWrapper.txParams = { from: kernelDeveloper }
    await this.kernelWrapper.register(this.releaseWrapper.address())
  });

  beforeEach("creating a new application", async function () {
    this.appManagerWrapper = await AppManagerDeployer.withStdlib('1', this.releaseWrapper.address(), { from: appDeveloper })
    await this.appManagerWrapper.setImplementation(PickACard, "PickACard")
    const token = await this.appManagerWrapper.createProxy(ERC721Token, "ERC721")
    this.mock = await this.appManagerWrapper.createProxy(PickACard, "PickACard", 'initialize', [token.address])
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
      this.anotherToken = await this.appManagerWrapper.createProxy(ERC721Token, "ERC721")
      this.anotherMock = await this.appManagerWrapper.createProxy(PickACard, "PickACard", 'initialize', [this.anotherToken.address]);
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
