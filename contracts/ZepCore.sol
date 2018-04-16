pragma solidity ^0.4.21;

import "./ZepToken.sol";
import "./KernelInstance.sol";
import "./KernelStakes.sol";
import "zos-core/contracts/Registry.sol";
import "zos-core/contracts/Initializable.sol";
import "zos-core/contracts/ProjectController.sol";
import "zos-core/contracts/upgradeability/UpgradeabilityProxyFactory.sol";
import "zos-core/contracts/ImplementationProvider.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title ZepCore
 * @dev This contract controls the kernel distributions and versions for ZeppelinOS
 */
contract ZepCore is Initializable, ImplementationProvider {
  using SafeMath for uint256;

  // Token used for staking
  ZepToken public token;

  // Staking contract
  KernelStakes public stakes;

  // Price of registering a new kernel version
  uint256 public newVersionCost;

  // Fraction of stakes rewarded to the developer of a kernel instance
  uint256 public developerFraction;

  // Keep track of registered kernel instances given their address
  mapping(address => bool) internal instances;

  /**
   * @dev Event signaling that a new instance has been registered
   * @param instance representing the new KernelInstance
   */
  event NewInstance(KernelInstance indexed instance);

  /**
  * @dev Guarantees that a given kernel instance is registered
  */
  modifier onlyWhenRegistered(KernelInstance instance) {
    require(instances[instance]);
    _;
  }

  /**
   * @dev Initialization function
   * @param _newVersionCost representing the price of registering a kernel version
   * @param _developerFraction representing the fraction of stakes rewarded to the developer of a kernel instance
   * @param _token representing the address of the staking token
   * @param _stakes representing the address of staking contract
   */
  function initialize(
    uint256 _newVersionCost,
    uint256 _developerFraction,
    ZepToken _token,
    KernelStakes _stakes
  ) public isInitializer {
    stakes = _stakes;
    token = _token;
    developerFraction = _developerFraction;
    newVersionCost = _newVersionCost;
    // TODO: we need to think how we are going to manage variable costs to propose new versions
  }

  /**
   * @dev Registers a new kernel instance into the registry and burns the sender's required amount of tokens for it
   * @param instance representing the kernel instance to be registered
   */
  function register(KernelInstance instance) public {
    require(!instances[instance]);
    instances[instance] = true;
    
    // TODO: Update to burnFrom once https://github.com/OpenZeppelin/zeppelin-solidity/pull/870 is merged
    require(token.transferFrom(msg.sender, this, newVersionCost));
    token.burn(newVersionCost);
  }

  /**
   * @dev Stakes a given amount for a given kernel instance
   * @param instance representing the kernel instance being staked for
   * @param amount representing the amount being staked
   * @param data representing additional information for complex staking models
   */
  function stake(KernelInstance instance, uint256 amount, bytes data) public onlyWhenRegistered(instance) {
    require(token.transferFrom(msg.sender, this, amount));
    _payoutAndStake(msg.sender, instance, amount, data);
  }

  /**
   * @dev Unstakes a given amount for a given kernel instance
   * @param instance representing the kernel instance being unstaked for
   * @param amount representing the amount being unstaked
   * @param data representing additional information for complex staking models
   */
  function unstake(KernelInstance instance, uint256 amount, bytes data) public onlyWhenRegistered(instance) { 
    stakes.unstake(msg.sender, instance, amount, data);
    token.transfer(msg.sender, amount);
  }

  /**
   * @dev Transfers stakes from a kernel instance to another one
   * @param from representing the kernel instance being unstaked for
   * @param to representing the kernel instance being staked for
   * @param amount representing the amount of stakes being transferred
   * @param data representing additional information for complex staking models
   */
  function transferStake(KernelInstance from, KernelInstance to, uint256 amount, bytes data) public onlyWhenRegistered(from) onlyWhenRegistered(to) {
    stakes.unstake(msg.sender, from, amount, data);
    _payoutAndStake(msg.sender, to, amount, data);
  }

  /**
   * @dev Stakes tokens for a given instance and pays the corresponding fraction to its developer
   * @param staker representing the address of the staker
   * @param instance representing the kernel instance being staked for
   * @param amount representing the amount being staked
   * @param data representing additional information for complex staking models

   */
  function _payoutAndStake(address staker, KernelInstance instance, uint256 amount, bytes data) internal {
    uint256 developerPayout = amount.div(developerFraction);
    require(developerPayout > 0);
    // TODO: Think how we can manage remainders in a better way

    uint256 stakedAmount = amount.sub(developerPayout);
    stakes.stake(staker, instance, stakedAmount, data);
    token.transfer(instance.developer(), developerPayout);
  }

  function isRegistered(KernelInstance instance) public view returns (bool) {
    return instances[instance];
  }
}
