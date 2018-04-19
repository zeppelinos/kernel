// Create a project controller for your project on top of zOS
// Run as: `npx truffle exec scripts/init_project.js --network NETWORK`

import deploy from "./deploy";
import { PROJECT_ACCOUNT, ERC721_CONTRACT_NAME } from '../constants'

const ERC721Token = artifacts.require('ERC721Token');
const AppDirectory = artifacts.require('AppDirectory');
const UpgradeabilityProxyFactory = artifacts.require('UpgradeabilityProxyFactory');
const UnversionedAppManager = artifacts.require('UnversionedAppManager');

async function createapp() {
  const { kernel, release } = await deploy.kernel();
  const provider = await AppDirectory.new(release.address, { from: PROJECT_ACCOUNT });
  const factory = await UpgradeabilityProxyFactory.new({ from: PROJECT_ACCOUNT });
  const appManager = await UnversionedAppManager.new(provider.address, factory.address, { from: PROJECT_ACCOUNT });

  log("\nDeployment complete! Now you can use your app manager to manage your projects upgrades and dependencies:")
  log(`> app = UnversionedAppManager.at('${appManager.address}')`)
  log(`> myERC721 = app.create('${ERC721_CONTRACT_NAME}')`)
  log("> myContractImpl = MyContract.new()")
  log(`> ContractDirectory.at(app.getProvider()).setImplementation('MyContract', myContractImpl.address)`)
  log(`> myContract = controller.create('MyContract')`)
}

module.exports = function(cb) {
  createapp().then(cb).catch(cb);
}
