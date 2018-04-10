// Create a project controller for your project on top of zOS
// Run as: `npx truffle exec scripts/init_project.js --network NETWORK`

import Deployer from "../deploy/Deployer";
import ZepCoreManager from "../deploy/ZepCoreManager";
import { PROJECT_ACCOUNT, PROJECT_NAME, ZEPPELIN_ACCOUNT, DEVELOPER_ACCOUNT, DEVELOPER_FRACTION, NEW_VERSION_COST, VERSION, DISTRIBUTION, ERC721_CONTRACT_NAME } from '../deploy/constants'

const ERC721Token = artifacts.require('ERC721Token');

async function deploy() {
  console.log('Deploying zepCore...')
  const zepCore = await Deployer.zepCore(ZEPPELIN_ACCOUNT, NEW_VERSION_COST, DEVELOPER_FRACTION, DISTRIBUTION)
  console.log('ZepCore address: ', zepCore.address)
  const zepCoreManager = new ZepCoreManager(zepCore, ZEPPELIN_ACCOUNT)
  await zepCoreManager.mintZepTokens(DEVELOPER_ACCOUNT, NEW_VERSION_COST)
  await zepCoreManager.registerKernelInstance(DISTRIBUTION, VERSION, ERC721Token, ERC721_CONTRACT_NAME, DEVELOPER_ACCOUNT)
  const controller = await Deployer.projectController(PROJECT_ACCOUNT, PROJECT_NAME, zepCore.address)

  console.log("\nDeployment complete! Now you can use your project controller to manage your projects upgrades and dependencies:\n")
  console.log(`> controller = ProjectController.at(${controller.address})`)
  console.log(`> myERC721 = controller.createAndCall(${DISTRIBUTION}, ${VERSION}, ${ERC721_CONTRACT_NAME}, [DATA]})`)
  console.log("> myContractBehavior = MyContract.new()")
  console.log(`> Registry.at(controller.registry()).addImplementation([VERSION], 'MyContract', myContractBehavior.address)`)
  console.log(`> myContract = controller.createAndCall(${PROJECT_NAME}, [VERSION], 'MyContract', [initialize data including myERC721.address])`)
}

module.exports = function(cb) {
  deploy().then(cb).catch(cb);
}
