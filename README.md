# zeppelin_os Kernel
[![Build Status](https://travis-ci.org/zeppelinos/kernel.svg?branch=master)](https://travis-ci.org/zeppelinos/kernel)
[![Coverage Status](https://coveralls.io/repos/github/zeppelinos/kernel/badge.svg?branch=master)](https://coveralls.io/github/zeppelinos/kernel?branch=master)

:warning: **Under heavy development: do not use in production** :warning:

This repository holds all the logic related to the **zeppelin_os** kernel. The kernel is responsible for registering different versions of the standard library, handling the vouching for these versions, and the payout for the developers. The core contracts are `Kernel`, `Vouching`, `ZepToken`, and `Release`. These contracts use the upgradeability and contract directory sytems provided in [upgradeability-lib](https://github.com/zeppelinos/upgradeability/). Also provided under `test` is an example where `ERC721` contracts from the library are used for a `PickACard` user app.

## Kernel
This is the main kernel contract, responsible of handling the different releases of the on-chain standard library of contracts. It allows developers to register new releases of the stdlib by burning a small amount of ZepTokens. After registration, users can vouch their ZepTokens for the different releases. Whenever a release gets new support, its developer gets a fraction of the ZepTokens voucehd. 

## Vouching
This serves as an auxiliary contract for `Kernel`, and is responsible of keeping track of the vouches of the different users for the available releases. It provides methods for recovering the vouches by specific user and release, and release and global totals.

## ZepToken
The `ZepToken` is the token used by the vouching system. It is a customized version of an ERC20 token, with added burnable, mintable, and pausable functionalities. The burnable property allows for developers to propose new stdlib versions by burning tokens. The mintable property is included only for simplicity to generate an initial amount of tokens. Finally, the pausable behavior is provided as a safety mechanism.

## Release
This contract represents a version of the stdlib proposed by a developer. It is based upon `FreezableContractDirectory` from the [upgradeability-lib](https://github.com/zeppelinos/upgradeability/) library, a directory that holds implementation addresses for different contracts and can be made permanently immutable by its owner. The `Release` contract extends from `FreezableContractDirectory` by adding a `developer` state variable, which holds the address that is rewarded after new vouches to the version.

## PickACard usage example
The `PickACard` game is provided as an example of usage of the kernel, together with mock `ERC721` library contracts. This last contracts showcase the simplicity of the modifications required to go from a standard off-chain library like [OpenZeppelin](https://github.com/OpenZeppelin/zeppelin-solidity/) to an on-chain, upgradeable stdlib of the type provided by **zeppelin_os**. In short, the constructor is replaced by an `initialize` method that takes care of initialzing the state variables, and is typically called upon creation of its upgradeability proxy. 


