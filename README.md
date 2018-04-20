# zeppelin_os Kernel
[![Build Status](https://travis-ci.org/zeppelinos/kernel.svg?branch=master)](https://travis-ci.org/zeppelinos/kernel)
[![Coverage Status](https://coveralls.io/repos/github/zeppelinos/kernel/badge.svg?branch=master)](https://coveralls.io/github/zeppelinos/kernel?branch=master)

:warning: **Under heavy development: do not use in production** :warning:

This repository holds all the logic related to the **zeppelin_os** kernel. The kernel is responsible for registering different versions of the standard library, handling the vouching for these versions, and the payout for the developers. The core contracts are `Kernel`, `Vouching`, `ZepToken`, and `Release`. These contracts use the upgradeability and contract directory sytems provided in the [zos-lib](https://github.com/zeppelinos/zos-lib/) library. Also provided under `test` is an example where `ERC721` contracts from the library are used for a `PickACard` user app.

## Kernel Contracts

### Kernel
This is the main kernel contract, responsible of handling the different releases of the on-chain standard library of contracts. It allows developers to register new releases of the stdlib by burning a small amount of ZepTokens. After registration, users can vouch their ZepTokens for the different releases. Whenever a release gets new support, its developer gets a fraction of the ZepTokens voucehd. 

### Vouching
This serves as an auxiliary contract for `Kernel`, and is responsible of keeping track of the vouches of the different users for the available releases. It provides methods for recovering the vouches by specific user and release, and release and global totals.

### ZepToken
The `ZepToken` is the token used by the vouching system. It is a customized version of an ERC20 token, with added burnable, mintable, and pausable functionalities. The burnable property allows for developers to propose new stdlib versions by burning tokens. The mintable property is included only for simplicity to generate an initial amount of tokens. Finally, the pausable behavior is provided as a safety mechanism.

### Release
This contract represents a version of the stdlib proposed by a developer. It is based upon `FreezableContractDirectory` from the [zos-lib](https://github.com/zeppelinos/zos-lib/) library, a directory that holds implementation addresses for different contracts and can be made permanently immutable by its owner. The `Release` contract extends from `FreezableContractDirectory` by adding a `developer` state variable, which holds the address that is rewarded after new vouches to the version.


## Developing kernel standard libraries
The **zeppelin_os** kernel handles releases of the standard library. Any developer can register new stdlib releases with the kernel, which can then be vouched for by other users, earning the developer a fraction of the `ZepTokens` staked. In order to register a new stdlib release, developers must first deploy each of the contracts to be included in it, making sure the constructors are replaced by an `initialize` method which initializes the state variables, like is done in the example in `ERC721Token`.

Once all contracts have been deployed, the developer must deploy a new `Release` instance. With the `Release` already on the blockchain, the contracts that are to be part of the release must be included using the `setImplementation` method of the `Release` (defined in [`ContractDirectory`](https://github.com/zeppelinos/zos-lib/contracts/application/versioning/ContractDirectory.sol), upstream in the inheritance hierachy). The method has the following prototype:
```
fuction setImplementation(string contractName, address implementation).
```
Here, `contractName` is the name of the contract to be registered (`ERC721Token` in the example), and `implementation` is the address at which it was deployed. 

Once all desired implementations have been added, the developer must "freeze" the release, by calling the `freeze` method (defined in [`FreezableContractDirectory`](https://github.com/zeppelinos/zos-lib/contracts/application/versioning/FreezableContractDirectory.sol), from which `Release` inherits).

Now the release is ready to be registered in the kernel, but, as registering releases costs `ZepToken`s, the developr must first give the kernel a token allowance, using the `approve` method of the `ERC20` token that `ZepToken` extends. This allowance needs to be greater or equal than the cost of registering a new version, specified in `Kernel`'s `_newVersionCost` state variable.

Finally, the new release can be registered using the `register` method from `Kernel`, which accepts a `Release` as its only argument. 

### Vouching
Once deployed, other users can vouch for a release by calling `Kernel`'s `vouch` method. Again, in order to vouch, users must first `approve` the kernel to transfer a share of their `ZepTokens` that is greater or equal than the amount they want to stake for the release. A fraction of these tokens will be immediately transferred to the release's developer, and the rest will be held in custody by the kernel, until an `unvouch` operation is performed. The fraction of the tokens payed out to the developer is specified in the `Kernel`'s `developerFraction` variable. Note that there is a minimum vouch for a release, given by the contstraint that its developer must receive at least one token.

### Release Pacakges
In order to facilitate the handling of evolving stdlib versions, instead of deploying individual releases for each version, developers can make "packages" that group their associated releases together. One way to do this is through the [`Package`](https://github.com/zeppelinos/zos-lib/contracts/application/versioning/Package.sol) contract, which can hold several releases, each associated with a version of the library. In this case, the developer would proceed as above, but deploying also a `Package`, and then adding releases to it through its `addVersion` method. This method has prototype:
```
function addVersion(string version, ContractProvider provider) public onlyOwner,
```
where `version` is the version name and `provider` is the release.

In this case, the interaction with the kernel is still at the release level, but there is an on-chain record of the different versions of the standard library that keeps track of which implementations are associated to the different contracts for each of its releases.

### Command Line Interface
For improved usability, all of the described functionality can be accessed through the command line by using the `zos` tool provided in the [zos-cli](https://github.com/zeppelinos/zos-cli) repository. This tool is useful for both users creating upgradeable projects using **zeppelin_os** and developers contributing releases of the standard library. A guide on its usage is provided in the linked repository.

### PickACard Example
The `PickACard` game is provided as an example of usage of the kernel, together with mock `ERC721` library contracts. This last contracts showcase the simplicity of the modifications required to go from a standard off-chain library like [OpenZeppelin](https://github.com/OpenZeppelin/zeppelin-solidity/) to an on-chain, upgradeable stdlib of the type provided by **zeppelin_os**. In short, the constructor is replaced by an `initialize` method that takes care of initialzing the state variables, and is typically called upon creation of its upgradeability proxy. 
