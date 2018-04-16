pragma solidity ^0.4.21;

import "./ZepToken.sol";
import "./Release.sol";
import "./Vouching.sol";
import "zos-core/contracts/Registry.sol";
import "zos-core/contracts/Initializable.sol";
import "zos-core/contracts/ProjectController.sol";
import "zos-core/contracts/upgradeability/UpgradeabilityProxyFactory.sol";
import "zos-core/contracts/ImplementationProvider.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title Kernel
 * @dev This contract controls the kernel distributions and versions for ZeppelinOS
 */
contract Kernel is Initializable, ImplementationProvider {
  using SafeMath for uint256;

  // Token used for vouching
  ZepToken public token;

  // Staking contract
  Vouching public vouches;

  // Price of registering a new kernel version
  uint256 public newVersionCost;

  // Fraction of vouches rewarded to the developer of a kernel release
  uint256 public developerFraction;

  // Keep track of registered kernel releases given their address
  mapping(address => bool) internal releases;

  /**
   * @dev Event signaling that a new release has been registered
   * @param release representing the new Release
   */
  event NewInstance(Release indexed release);

  /**
  * @dev Guarantees that a given kernel release is registered
  */
  modifier onlyWhenRegistered(Release release) {
    require(releases[release]);
    _;
  }

  /**
   * @dev Initialization function
   * @param _newVersionCost representing the price of registering a kernel version
   * @param _developerFraction representing the fraction of vouches rewarded to the developer of a kernel release
   * @param _token representing the address of the vouching token
   * @param _vouches representing the address of vouching contract
   */
  function initialize(
    uint256 _newVersionCost,
    uint256 _developerFraction,
    ZepToken _token,
    Vouching _vouches
  ) public isInitializer {
    vouches = _vouches;
    token = _token;
    developerFraction = _developerFraction;
    newVersionCost = _newVersionCost;
    // TODO: we need to think how we are going to manage variable costs to propose new versions
  }

  /**
   * @dev Registers a new kernel release into the registry and burns the sender's required amount of tokens for it
   * @param release representing the kernel release to be registered
   */
  function register(Release release) public {
    require(!releases[release]);
    releases[release] = true;
    
    // TODO: Update to burnFrom once https://github.com/OpenZeppelin/zeppelin-solidity/pull/870 is merged
    require(token.transferFrom(msg.sender, this, newVersionCost));
    token.burn(newVersionCost);
  }

  /**
   * @dev Vouches a given amount for a given kernel release
   * @param release representing the kernel release being vouched for
   * @param amount representing the amount being vouched
   * @param data representing additional information for complex vouching models
   */
  function vouch(Release release, uint256 amount, bytes data) public onlyWhenRegistered(release) {
    require(token.transferFrom(msg.sender, this, amount));
    _payoutAndStake(msg.sender, release, amount, data);
  }

  /**
   * @dev Unvouches a given amount for a given kernel release
   * @param release representing the kernel release being unvouched for
   * @param amount representing the amount being unvouched
   * @param data representing additional information for complex vouching models
   */
  function unvouch(Release release, uint256 amount, bytes data) public onlyWhenRegistered(release) { 
    vouches.unvouch(msg.sender, release, amount, data);
    token.transfer(msg.sender, amount);
  }

  /**
   * @dev Transfers vouches from a kernel release to another one
   * @param from representing the kernel release being unvouched for
   * @param to representing the kernel release being vouched for
   * @param amount representing the amount of vouches being transferred
   * @param data representing additional information for complex vouching models
   */
  function transferStake(Release from, Release to, uint256 amount, bytes data) public onlyWhenRegistered(from) onlyWhenRegistered(to) {
    vouches.unvouch(msg.sender, from, amount, data);
    _payoutAndStake(msg.sender, to, amount, data);
  }

  /**
   * @dev Stakes tokens for a given release and pays the corresponding fraction to its developer
   * @param voucher representing the address of the voucher
   * @param release representing the kernel release being vouched for
   * @param amount representing the amount being vouched
   * @param data representing additional information for complex vouching models

   */
  function _payoutAndStake(address voucher, Release release, uint256 amount, bytes data) internal {
    uint256 developerPayout = amount.div(developerFraction);
    require(developerPayout > 0);
    // TODO: Think how we can manage remainders in a better way

    uint256 vouchedAmount = amount.sub(developerPayout);
    vouches.vouch(voucher, release, vouchedAmount, data);
    token.transfer(release.developer(), developerPayout);
  }

  function isRegistered(Release release) public view returns (bool) {
    return releases[release];
  }
}
