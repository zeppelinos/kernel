# zOS Kernel Registry

:warning: **Under heavy development: do not use in production**

## Motivation

The idea of this repository is to hold all the logic related to the kernel registry of zOS. This means, required 
contracts to carry out the registration of new versions, staking or vouching for proposed versions, payout 
distributions, and the ZepToken. Said contracts can be found in the main `contracts` folder.

In addition, the kernel registry uses all the proxies and upgradeability logic of [zos-core](https://github.com/zeppelinos/zos-core/). 

## Specs

Deploy a zOS instance:
```
$ npx truffle exec scripts/deploy.js --network NETWORK
```

Deploy your own project on top of zOS:
```
$ npx truffle exec scripts/init_project.js --network NETWORK
```
