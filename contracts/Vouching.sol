pragma solidity ^0.4.21;

import "zos-lib/contracts/migrations/Migratable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title Vouching
 * @dev This contract keeps track of all submitted vouches for stdlib releases
 */
contract Vouching is Migratable, Ownable {
  using SafeMath for uint256;

  /**
   * @dev Event signaling a new vouch
   * @param voucher the address of the voucher
   * @param release the stdlib release vouched for
   * @param amount the vouched amount
   * @param total the new total amount vouched
   * @param data additional information for complex vouching models
   */
  event Vouched(address indexed voucher, address release, uint256 amount, uint256 total, bytes data);

  /**
   * @dev Event signaling an unvouching
   * @param voucher the address of the voucher
   * @param release the stdlib release unvouched for
   * @param amount the unvouched amount
   * @param total the new total amount vouched
   * @param data additional information for complex vouching models
   */
  event Unvouched(address indexed voucher, address release, uint256 amount, uint256 total, bytes data);

  // Total amount of vouched tokens
  uint256 private _totalVouched;

  // Mapping from a release address to its vouched amount
  mapping(address => uint256) private _releaseVouches;

  // Mapping of voucher addresses to their vouched amount for a given release address
  mapping(address => mapping (address => uint256)) private _vouches;

  /**
   * @dev Initialization function, sets the owner
   * @param _owner the address of the owner
   */
  function initialize(address _owner) public isInitializer("Vouching", "0") {
    owner = _owner;
  }

  /**
   * @dev Retrieves the total vouched amount
   * @return the total vouched amount
   */
  function totalVouched() public view returns (uint256) {
    return _totalVouched;
  }

  /**
   * @dev Retrieves the vouched amount for a given kernel
   * @param release the kernel release
   * @return the total vouched amount for a given kernel
   */
  function totalVouchedFor(address release) public view returns (uint256) {
    return _releaseVouches[release];
  }

  /**
   * @dev Retrieves the vouched amount by a voucher for a given release
   * @param voucher the voucher address
   * @param release the stdlib release
   * @return the total vouched amount by the voucher for the given release
   */
  function vouchedFor(address voucher, address release) public view returns (uint256) {
    return _vouches[voucher][release];
  }

  /**
   * @dev Vouches a given amount for a given release and emits the corresponding event
   * @param voucher the voucher address
   * @param release the release being vouched for
   * @param amount the amount being vouched
   * @param data additional information for complex vouching models
   */
  function vouch(address voucher, address release, uint256 amount, bytes data) public onlyOwner {
    _totalVouched = _totalVouched.add(amount);
    _releaseVouches[release] = _releaseVouches[release].add(amount);
    _vouches[voucher][release] = _vouches[voucher][release].add(amount);

    emit Vouched(voucher, release, amount, _releaseVouches[release], data);
  }

  /**
   * @dev Unvouches a given amount for a given release and emits the corresponding event
   * @param voucher the voucher address
   * @param release the release being unvouched for
   * @param amount the amount being unvouched
   * @param data additional information for complex vouching models
   */
  function unvouch(address voucher, address release, uint256 amount, bytes data) public onlyOwner {
    uint256 currentVouch = _vouches[voucher][release];
    require(currentVouch >= amount);

    _totalVouched = totalVouched().sub(amount);
    _releaseVouches[release] = _releaseVouches[release].sub(amount);
    _vouches[voucher][release] = currentVouch.sub(amount);

    emit Unvouched(voucher, release, amount, _releaseVouches[release], data);
  }
}
