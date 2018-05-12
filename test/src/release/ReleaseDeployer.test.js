import ReleaseDeployer from "../../../src/release/ReleaseDeployer"

contract('ReleaseDeployer', ([_, owner]) => {
  const txParams = { from: owner }
  const contracts = [{ alias: 'ERC721Token', name: 'ERC721Token' }]

  describe('call', function () {
    beforeEach(async function () {
      this.release = await ReleaseDeployer.call(contracts, txParams)
    })

    it('deploys a new release', async function () {
      this.release.address().should.not.be.null
      this.release.owner().should.eventually.be.equal(owner)
    })

    it('includes the given contracts', async function () {
      (await this.release.getImplementation('ERC721Token')).should.not.be.zero
    })
  })
})
