// Create an app manager for your project on top of zOS
// Deploys sample zOS along with a sample Kernel (see deploy)
// Run as: `npx truffle exec scripts/createapp.js --network NETWORK`

global.web3 = web3;
global.artifacts = artifacts;
global.ContractsProvider = require('../src/utils/ContractsProvider').default

const { AppManagerDeployer, Logger } = require('zos-lib')
const { PROJECT_VERSION, PROJECT_ACCOUNT, ERC721_CONTRACT_NAME } = require('./constants')
const deployKernelAndReleaseSample = require("./deploy").deployKernelAndReleaseSample

const log = new Logger('createapp')

async function createapp() {
  const { release } = await deployKernelAndReleaseSample();
  const appManager = await AppManagerDeployer.withStdlib(PROJECT_VERSION, release.address(), { from: PROJECT_ACCOUNT })

  log.info("Deployment complete! Now you can use your app manager to manage your projects upgrades and dependencies:")
  log.info(`> app = PackagedAppManager.at('${appManager.address()}')`)
  log.info(`> myERC721 = app.create('${ERC721_CONTRACT_NAME}')`)
  log.info("> myContractImpl = MyContract.new()")
  log.info(`> ContractDirectory.at(app.getProvider()).setImplementation('MyContract', myContractImpl.address)`)
  log.info(`> myContract = app.create('MyContract')`)
}

module.exports = function(cb) {
  createapp().then(cb).catch(cb);
}
