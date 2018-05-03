import { ContractsProvider } from 'zos-lib'
ContractsProvider.getFromKernel = contractName => ContractsProvider.getByName(contractName)
export default ContractsProvider
