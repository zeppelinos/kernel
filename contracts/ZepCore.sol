pragma solidity ^0.4.21;

import "./ZepToken.sol";
import "./KernelInstance.sol";
import "./KernelRegistry.sol";
import "./KernelStakes.sol";
import "zos-core/contracts/Registry.sol";
import "zos-core/contracts/Initializable.sol";
import "zos-core/contracts/ProjectController.sol";
import "zos-core/contracts/upgradeability/UpgradeabilityProxyFactory.sol";
import "zos-core/contracts/ImplementationProvider.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

contract ZepCore is Initializable, ImplementationProvider {
  using SafeMath for uint256;

  ZepToken private _token;
  KernelRegistry private _registry;
  KernelStakes private _stakes;

  uint256 public newVersionCost;
  uint256 public developerFraction;

  function ZepCore() public {}

  function initialize(
    uint256 newVersionCost_,
    uint256 developerFraction_,
    ZepToken token_,
    KernelRegistry registry_,
    KernelStakes stakes_
  ) public isInitializer {
    _registry = registry_;
    _stakes = stakes_;
    _token = token_;
    developerFraction = developerFraction_;
    newVersionCost = newVersionCost_;
    // TODO: we need to think how we are going to manage variable costs to propose new versions
  }

  function token() public view returns (ZepToken) {
    return _token;
  }

  function registry() public view returns (KernelRegistry) {
    return _registry;
  }

  function stakes() public view returns (KernelStakes) {
    return _stakes;
  }

  function register(KernelInstance instance) public {
    _registry.addInstance(instance);
    
    // TODO: Update to burnFrom once https://github.com/OpenZeppelin/zeppelin-solidity/pull/870 is merged
    _token.transferFrom(msg.sender, this, newVersionCost);
    _token.burn(newVersionCost);
  }

  function getInstance(string name, string version) public view returns(KernelInstance) {
    return _registry.getInstance(name, version);
  }

  function getImplementation(string distribution, string version, string contractName) public view returns (address) {
    KernelInstance instance = getInstance(distribution, version);
    return instance.getImplementation(contractName);
  }

  function stake(KernelInstance instance, uint256 amount, bytes data) public {
    _token.transferFrom(msg.sender, this, amount);
    _payoutAndStake(msg.sender, instance, amount, data);
  }

  function unstake(KernelInstance instance, uint256 amount, bytes data) public {
    _stakes.unstake(msg.sender, instance, amount, data);
    _token.transfer(msg.sender, amount);
  }

  function transferStake(KernelInstance from, KernelInstance to, uint256 amount, bytes data) public {
    _stakes.unstake(msg.sender, from, amount, data);
    _payoutAndStake(msg.sender, to, amount, data);
  }

  function _payoutAndStake(address staker, KernelInstance instance, uint256 amount, bytes data) private {
    uint256 developerPayout = amount.div(developerFraction);
    require(developerPayout > 0);
    // TODO: Think how we can manage remainders in a better way

    uint256 stakedAmount = amount.sub(developerPayout);
    _stakes.stake(staker, instance, stakedAmount, data);
    _token.transfer(instance.developer(), developerPayout);
  }
}
