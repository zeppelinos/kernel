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

/**
 * @title ZepCore
 * @dev This contract controls the kernel distributions and versions for ZeppelinOS
 */
contract ZepCore is Initializable, ImplementationProvider {
  using SafeMath for uint256;

  // Token used for staking
  ZepToken private _token;

  // Registry of kernel versions
  KernelRegistry private _registry;

  // Staking contract
  KernelStakes private _stakes;

  // Price of registering a new kernel version
  uint256 public newVersionCost;

  // Fraction of stakes rewarded to the developer of a kernel instance
  uint256 public developerFraction;

  /**
  * @dev Guarantees that a given kernel instance is registered
  */
  modifier isRegistered(KernelInstance instance) {
    require(_registry.isRegistered(instance));
    _;
  }

  /**
  * @dev Constructor function
  */
  function ZepCore() public {}

  /**
   * @dev Initialization function
   * @param newVersionCost_ representing the price of registering a kernel version
   * @param developerFraction_ representing the fraction of stakes rewarded to the developer of a kernel instance
   * @param _owner representing the address of the owner
   * @param _owner representing the address of the owner
   * @param _owner representing the address of the owner
   */
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

  /**
   * @dev Retrieves the token used for staking
   * @returns the token used for staking
   */
  function token() public view returns (ZepToken) {
    return _token;
  }

  /**
   * @dev Retrieves the registry of kernel versions
   * @returns the registry of kernel versions
   */
  function registry() public view returns (KernelRegistry) {
    return _registry;
  }

  /**
   * @dev Retrieves the staking contract
   * @returns the staking contract
   */
  function stakes() public view returns (KernelStakes) {
    return _stakes;
  }

  /**
   * @dev Registers a new kernel instance into the registry and burns the sender's required amount of tokens for it
   * @param instance representing the kernel instance to be registered
   */
  function register(KernelInstance instance) public {
    _registry.addInstance(instance);
    
    // TODO: Update to burnFrom once https://github.com/OpenZeppelin/zeppelin-solidity/pull/870 is merged
    _token.transferFrom(msg.sender, this, newVersionCost);
    _token.burn(newVersionCost);
  }

  /**
   * @dev Retrieves the kernel instance for a given distribution name and version
   * @param name representing the distribution name
   * @param version representing the distribution version
   * @returns the kernel instance
   */
  function getInstance(string name, string version) public view returns(KernelInstance) {
    return _registry.getInstance(name, version);
  }

  /**
   * @dev Retrieves the implementation for a given distribution name and version
   * @param name representing the distribution name
   * @param version representing the distribution version
   * @returns the implementation address
   */
  function getImplementation(string distribution, string version, string contractName) public view returns (address) {
    KernelInstance instance = getInstance(distribution, version);
    return instance.getImplementation(contractName);
  }

  /**
   * @dev Stakes a given amount for a given kernel instance
   * @param instance representing the kernel instance being staked for
   * @param amount representing the amount being staked
   * @param data representing additional information for complex staking models. Included to comply with the ERC900 staking interface (https://github.com/ethereum/EIPs/pull/910)
   */
  function stake(KernelInstance instance, uint256 amount, bytes data) public isRegistered(instance) {
    _token.transferFrom(msg.sender, this, amount);
    _payoutAndStake(msg.sender, instance, amount, data);
  }

  /**
   * @dev Unstakes a given amount for a given kernel instance
   * @param instance representing the kernel instance being unstaked for
   * @param amount representing the amount being unstaked
   * @param data representing additional information for complex staking models. Included to comply with the ERC900 staking interface (https://github.com/ethereum/EIPs/pull/910)
   */
 function unstake(KernelInstance instance, uint256 amount, bytes data) public isRegistered(instance) {
    _stakes.unstake(msg.sender, instance, amount, data);
    _token.transfer(msg.sender, amount);
  }

  /**
   * @dev Transfers stakes from a kernel instance to another one
   * @param from representing the kernel instance being unstaked for
   * @param to representing the kernel instance being staked for
   * @param amount representing the amount of stakes being transferred
   * @param data representing additional information for complex staking models. Included to comply with the ERC900 staking interface (https://github.com/ethereum/EIPs/pull/910)
   */
  function transferStake(KernelInstance from, KernelInstance to, uint256 amount, bytes data) public isRegistered(from) isRegistered(to) {
    _stakes.unstake(msg.sender, from, amount, data);
    _payoutAndStake(msg.sender, to, amount, data);
  }

  /**
   * @dev Stakes tokens for a given instance and pays the corresponding fraction to its developer
   * @param staker representing the address of the staker
   * @param instance representing the kernel instance being staked for
   * @param amount representing the amount being staked
   * @param data representing additional information for complex staking models. Included to comply with the ERC900 staking interface (https://github.com/ethereum/EIPs/pull/910)

   */
  function _payoutAndStake(address staker, KernelInstance instance, uint256 amount, bytes data) internal {
    uint256 developerPayout = amount.div(developerFraction);
    require(developerPayout > 0);
    // TODO: Think how we can manage remainders in a better way

    uint256 stakedAmount = amount.sub(developerPayout);
    _stakes.stake(staker, instance, stakedAmount, data);
    _token.transfer(instance.developer(), developerPayout);
  }
}
