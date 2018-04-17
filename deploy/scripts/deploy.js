import Deployer from '../objects/Deployer';
import KernelWrapper from '../objects/KernelWrapper';
import { ZEPPELIN_ACCOUNT, DEVELOPER_ACCOUNT, DEVELOPER_FRACTION, NEW_VERSION_COST, KERNEL_VERSION, ERC721_CONTRACT_NAME } from '../constants';

const log = require('../logger');
const ERC721Token = artifacts.require('ERC721Token');

async function deployKernel() {
  log('Deploying Kernel...')
  const deployer = new Deployer(ZEPPELIN_ACCOUNT);
  await deployer.initAppManager(KERNEL_VERSION);
  await deployer.registerKernel();
  const { kernel } = await deployer.deployKernel(NEW_VERSION_COST, DEVELOPER_FRACTION);

  log('  Kernel address: ', kernel.address)
  const kernelWrapper = new KernelWrapper(kernel, ZEPPELIN_ACCOUNT)
  await kernelWrapper.mintZepTokens(DEVELOPER_ACCOUNT, NEW_VERSION_COST)
  const release = await kernelWrapper.registerRelease([[ERC721_CONTRACT_NAME, ERC721Token]], DEVELOPER_ACCOUNT)
  return { kernel, release }
}

async function deploy() {
  await deployKernel();
}

module.exports = function(cb) {
  deploy().then(cb).catch(cb);
}

module.exports.kernel = deployKernel;
