pragma solidity ^0.4.21;

import "zos-core/contracts/Initializable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title KernelStakes
 * @dev This contract keeps track of all submitted stakes for kernel instances
 */
contract KernelStakes is Initializable, Ownable {
  using SafeMath for uint256;

  /**
   * @dev Event signaling a new staking
   * @param staker representing the address of the staker
   * @param instance representing the kernel staked for
   * @param amount representing the staked amount
   * @param total representing the new total amount staked
   * @param data // TODO
   */
  event Staked(address indexed staker, address instance, uint256 amount, uint256 total, bytes data);

  /**
   * @dev Event signaling an unstaking
   * @param staker representing the address of the staker
   * @param instance representing the kernel unstaked for
   * @param amount representing the unstaked amount
   * @param total representing the new total amount staked
   * @param data // TODO
   */
  event Unstaked(address indexed staker, address instance, uint256 amount, uint256 total, bytes data);

  // Total amount of staked tokens
  uint256 private _totalStaked;

  // Mapping from a kernel address to its staked amount
  mapping(address => uint256) private _instanceVouches;

  // Mapping of staker addresses to their staked amount for a given kernel address
  mapping(address => mapping (address => uint256)) private _stakerVouches;

  /**
  * @dev Constructor function
  */
  function KernelStakes() public {}

  /**
   * @dev Initialization function, sets the owner
   * @param _owner representing the address of the owner
   */
  function initialize(address _owner) public isInitializer {
    owner = _owner;
  }

  /**
   * @dev Tells the total staked amount
   * @returns the total staked amount
   */
  function totalStaked() public view returns (uint256) {
    return _totalStaked;
  }

  /**
   * @dev Tells the staked amount for a given kernel
   * @param instance representing the kernel instance
   * @returns the total staked amount for a given kernel
   */
  function totalStakedFor(address instance) public view returns (uint256) {
    return _instanceVouches[instance];
  }

  /**
   * @dev Tells the staked amount by a staker for a given kernel
   * @param staker representing the staker address
   * @param instance representing the kernel instance
   * @returns the total staked amount by the staker for the given kernel
   */
  function stakedFor(address staker, address instance) public view returns (uint256) {
    return _stakerVouches[staker][instance];
  }

  /**
   * @dev Stakes a given amount for a given kernel instance and emits the corresponding event
   * @param staker representing the staker address
   * @param instance representing the kernel instance being staked for
   * @param amount representing the amount being staked
   * @param data // TODO
   */
  function stake(address staker, address instance, uint256 amount, bytes data) public onlyOwner {
    _totalStaked = _totalStaked.add(amount);
    _instanceVouches[instance] = _instanceVouches[instance].add(amount);
    _stakerVouches[staker][instance] = _stakerVouches[staker][instance].add(amount);

    emit Staked(staker, instance, amount, _instanceVouches[instance], data);
  }

  /**
   * @dev Unstakes a given amount for a given kernel instance and emits the corresponding event
   * @param staker representing the staker address
   * @param instance representing the kernel instance being unstaked for
   * @param amount representing the amount being unstaked
   * @param data // TODO
   */
  function unstake(address staker, address instance, uint256 amount, bytes data) public onlyOwner {
    uint256 currentStake = _stakerVouches[staker][instance];
    require(currentStake >= amount);

    _totalStaked = totalStaked().sub(amount);
    _instanceVouches[instance] = _instanceVouches[instance].sub(amount);
    _stakerVouches[staker][instance] = currentStake.sub(amount);

    emit Unstaked(staker, instance, amount, _instanceVouches[instance], data);
  }
}
