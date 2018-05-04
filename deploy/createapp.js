import deploy from "./deploy";
import ContractsProvider from '../src/utils/ContractsProvider'
import { PROJECT_ACCOUNT, ERC721_CONTRACT_NAME } from './constants'

async function createapp() {
  const { release } = await deploy.deployKernelAndReleaseSample();

  const AppDirectory = ContractsProvider.getFromArtifacts('AppDirectory')
  const appDirectory = await AppDirectory.new(release.address, { from: PROJECT_ACCOUNT })

  const UpgradeabilityProxyFactory = ContractsProvider.getFromArtifacts('UpgradeabilityProxyFactory')
  const factory = await UpgradeabilityProxyFactory.new({ from: PROJECT_ACCOUNT })

  const UnversionedAppManager = ContractsProvider.getFromArtifacts('UnversionedAppManager')
  const appManager = await UnversionedAppManager.new(appDirectory.address, factory.address, { from: PROJECT_ACCOUNT })

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
