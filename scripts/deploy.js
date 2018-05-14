// Deploy the zeppelin OS kernel with a sample release
// Run as: `npx truffle exec scripts/deploy.js --network NETWORK`

global.web3 = web3;
global.artifacts = artifacts;
global.ContractsProvider = require('../src/utils/ContractsProvider').default;

const KernelDeployer = require('../src/kernel/KernelDeployer').default
const ReleaseDeployer = require('../src/release/ReleaseDeployer').default
const { ZEPPELIN_ACCOUNT, DEVELOPER_ACCOUNT, DEVELOPER_FRACTION, NEW_VERSION_COST, KERNEL_VERSION, ERC721_CONTRACT_NAME } = require('./constants')

async function deployKernelAndReleaseSample() {
  const zeppelinTxParams = { from: ZEPPELIN_ACCOUNT }
  const kernel = await KernelDeployer.call(KERNEL_VERSION, NEW_VERSION_COST, DEVELOPER_FRACTION, zeppelinTxParams)
  await kernel.mintZepTokens(DEVELOPER_ACCOUNT, NEW_VERSION_COST)

  const developerTxParams = { from: DEVELOPER_ACCOUNT }
  const contracts = [{ name: ERC721_CONTRACT_NAME, alias: ERC721_CONTRACT_NAME }]
  const release = await ReleaseDeployer.call(contracts, developerTxParams)
  await release.freeze()
  kernel.txParams = developerTxParams
  await kernel.register(release.address())

  return { kernel, release }
}

async function deploy() {
  await deployKernelAndReleaseSample()
}

module.exports = function(cb) {
  deploy().then(cb).catch(cb)
}

module.exports.deployKernelAndReleaseSample = deployKernelAndReleaseSample;
