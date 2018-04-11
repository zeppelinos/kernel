import Deployer from '../objects/Deployer';
import ZepCoreManager from '../objects/ZepCoreManager';
import { ZEPPELIN_ACCOUNT, DEVELOPER_ACCOUNT, DEVELOPER_FRACTION, NEW_VERSION_COST, VERSION, DISTRIBUTION, ERC721_CONTRACT_NAME } from '../constants';

const ERC721Token = artifacts.require('ERC721Token');

async function deploy() {
  console.log('Deploying zepCore...')
  const { zepCore } = await Deployer.zepCore(ZEPPELIN_ACCOUNT, NEW_VERSION_COST, DEVELOPER_FRACTION, DISTRIBUTION)
  console.log('ZepCore address: ', zepCore.address)
  const zepCoreManager = new ZepCoreManager(zepCore, ZEPPELIN_ACCOUNT)
  await zepCoreManager.mintZepTokens(DEVELOPER_ACCOUNT, NEW_VERSION_COST)
  await zepCoreManager.registerKernelInstance(DISTRIBUTION, VERSION, ERC721Token, ERC721_CONTRACT_NAME, DEVELOPER_ACCOUNT)
}

module.exports = function(cb) {
  deploy().then(cb).catch(cb);
}
