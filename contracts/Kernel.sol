pragma solidity ^0.4.21;

import "./ZepToken.sol";
import "./Release.sol";
import "./Vouching.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zos-lib/contracts/migrations/Migratable.sol";
import "zos-lib/contracts/upgradeability/UpgradeabilityProxyFactory.sol";

/**
 * @title Kernel
 * @dev This contract controls the standard library releases for ZeppelinOS
 */
contract Kernel is Migratable {
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
  event ReleaseRegistered(Release release);

  /**
  * @dev Guarantees that a given release is registered
  */
  modifier whenRegistered(Release release) {
    require(isRegistered(release));
    _;
  }

  /**
   * @dev Initialization function
   * @param _newVersionCost representing the price of registering a new release
   * @param _developerFraction representing the fraction of vouches rewarded to the developer of the release
   * @param _token representing the address of the vouching token
   * @param _vouches representing the address of vouching contract
   */
  function initialize(
    uint256 _newVersionCost,
    uint256 _developerFraction,
    ZepToken _token,
    Vouching _vouches
  ) public isInitializer("Kernel", "0") {
    vouches = _vouches;
    token = _token;
    developerFraction = _developerFraction;
    newVersionCost = _newVersionCost;
    // TODO: we need to think how we are going to manage variable costs to propose new versions
  }

  /**
   * @dev Registers a new release and burns the sender's required amount of tokens for it
   * @param release representing the stdlib release to be registered
   */
  function register(Release release) public {
    require(!isRegistered(release));
    require(release.frozen());
    releases[release] = true;
    emit ReleaseRegistered(release);
    
    // TODO: Update to burnFrom once https://github.com/OpenZeppelin/zeppelin-solidity/pull/870 is merged
    require(token.transferFrom(msg.sender, this, newVersionCost));
    token.burn(newVersionCost);
  }

  /**
  * @dev Tells whether a given release is registered or not
  * @param release representing the stdlib release to be checked for
  */
  function isRegistered(Release release) public view returns (bool) {
    return releases[release];
  }

  /**
   * @dev Vouches a given amount for a requested release
   * @param release representing the stdlib release being vouched for
   * @param amount representing the amount being vouched
   * @param data representing additional information for complex vouching models
   */
  function vouch(Release release, uint256 amount, bytes data) public whenRegistered(release) {
    require(token.transferFrom(msg.sender, this, amount));
    _payoutAndVouch(msg.sender, release, amount, data);
  }

  /**
   * @dev Unvouches a given amount for a requested release
   * @param release representing the stdlib release being unvouched for
   * @param amount representing the amount being unvouched
   * @param data representing additional information for complex vouching models
   */
  function unvouch(Release release, uint256 amount, bytes data) public whenRegistered(release) {
    vouches.unvouch(msg.sender, release, amount, data);
    token.transfer(msg.sender, amount);
  }

  /**
   * @dev Transfers vouches from a release to another
   * @param from representing the stdlib release being unvouched for
   * @param to representing the stdlib release being vouched for
   * @param amount representing the amount of vouches being transferred
   * @param data representing additional information for complex vouching models
   */
  function transferStake(Release from, Release to, uint256 amount, bytes data) public whenRegistered(from) whenRegistered(to) {
    vouches.unvouch(msg.sender, from, amount, data);
    _payoutAndVouch(msg.sender, to, amount, data);
  }

  /**
   * @dev Stakes tokens for a given release and pays the corresponding fraction to its developer
   * @param voucher representing the address of the voucher
   * @param release representing the stdlib release being vouched for
   * @param amount representing the amount being vouched
   * @param data representing additional information for complex vouching models
   */
  function _payoutAndVouch(address voucher, Release release, uint256 amount, bytes data) internal {
    uint256 developerPayout = amount.div(developerFraction);
    require(developerPayout > 0);
    // TODO: Think how we can manage remainders in a better way

    uint256 vouchedAmount = amount.sub(developerPayout);
    vouches.vouch(voucher, release, vouchedAmount, data);
    token.transfer(release.developer(), developerPayout);
  }
}
