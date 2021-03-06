import { Logger } from 'zos-lib'
import truffleContract from 'truffle-contract'
import ContractsProvider from '../src/utils/ContractsProvider'

const DEFAULT_TX_PARAMS = {
  gas: 6721975,
  gasPrice: 100000000000,
  from: web3.eth.accounts[0]
}

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

muteLogging()
provideContractsFromTruffle()

function muteLogging() {
  Logger.prototype.info = msg => {}
  Logger.prototype.error = msg => {}
}

function provideContractsFromTruffle() {
  ContractsProvider.getByName = contractName => {
    return ContractsProvider.getFromArtifacts(contractName)
  }

  ContractsProvider.getFromKernel = contractName => {
    return ContractsProvider.getFromArtifacts(contractName)
  }

  ContractsProvider.getByJSONData = (data) => {
    const contract = truffleContract(data)
    contract.setProvider(web3.currentProvider)
    contract.defaults(DEFAULT_TX_PARAMS)
    return contract
  }

  global.ContractsProvider = ContractsProvider
}
