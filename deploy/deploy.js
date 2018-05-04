import { Logger, AppManagerDeployer } from 'zos-lib'
import KernelDeployer from '../src/kernel/KernelDeployer'
import ReleaseDeployer from '../src/release/ReleaseDeployer'
import { ZEPPELIN_ACCOUNT, DEVELOPER_ACCOUNT, DEVELOPER_FRACTION, NEW_VERSION_COST, KERNEL_VERSION, ERC721_CONTRACT_NAME } from './constants';

async function deployKernelAndReleaseSample() {
  const zeppelinTxParams = { from: ZEPPELIN_ACCOUNT }
  const kernel = KernelDeployer.call(KERNEL_VERSION, NEW_VERSION_COST, DEVELOPER_FRACTION, zeppelinTxParams)
  await kernel.mintZepTokens(DEVELOPER_ACCOUNT, NEW_VERSION_COST)

  const developerTxParams = { from: DEVELOPER_ACCOUNT }
  const contracts = [{ name: ERC721_CONTRACT_NAME, alias: ERC721_CONTRACT_NAME }]
  const release = ReleaseDeployer.call(contracts, developerTxParams)
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
