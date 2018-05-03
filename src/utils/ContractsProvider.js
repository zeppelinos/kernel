import { ContractsProvider } from 'zos-lib'

ContractsProvider.getFromKernel = contractName => {
  return ContractsProvider.getByName(contractName)
}

ContractsProvider.getFromLib = contractName => {
  const data = require(`zos-lib/build/contracts/${contractName}.json`)
  return ContractsProvider.getByJSONData(data)
}

export default ContractsProvider
