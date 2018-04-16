pragma solidity ^0.4.21;

import "zos-core/contracts/Initializable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title Vouching
 * @dev This contract keeps track of all submitted vouches for kernel releases
 */
contract Vouching is Initializable, Ownable {
  using SafeMath for uint256;

  /**
   * @dev Event signaling a new vouch
   * @param voucher representing the address of the voucher
   * @param release representing the kernel vouched for
   * @param amount representing the vouched amount
   * @param total representing the new total amount vouched by the voucher
   * @param data representing additional information for complex vouching models
   */
  event Vouched(address indexed voucher, address release, uint256 amount, uint256 total, bytes data);

  /**
   * @dev Event signaling an unvouching
   * @param voucher representing the address of the voucher
   * @param release representing the kernel unvouched for
   * @param amount representing the unvouched amount
   * @param total representing the new total amount vouched by the voucher
   * @param data representing additional information for complex vouching models
   */
  event Unvouched(address indexed voucher, address release, uint256 amount, uint256 total, bytes data);

  // Total amount of vouched tokens
  uint256 private _totalVouched;

  // Mapping from a kernel address to its vouched amount
  mapping(address => uint256) private _releaseVouches;

  // Mapping of voucher addresses to their vouched amount for a given kernel address
  mapping(address => mapping (address => uint256)) private _stakerVouches;

  /**
   * @dev Initialization function, sets the owner
   * @param _owner representing the address of the owner
   */
  function initialize(address _owner) public isInitializer {
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
   * @param release representing the kernel release
   * @return the total vouched amount for a given kernel
   */
  function totalVouchedFor(address release) public view returns (uint256) {
    return _releaseVouches[release];
  }

  /**
   * @dev Retrieves the vouched amount by a voucher for a given kernel
   * @param voucher representing the voucher address
   * @param release representing the kernel release
   * @return the total vouched amount by the voucher for the given kernel
   */
  function vouchedFor(address voucher, address release) public view returns (uint256) {
    return _stakerVouches[voucher][release];
  }

  /**
   * @dev Vouches a given amount for a given kernel release and emits the corresponding event
   * @param voucher representing the voucher address
   * @param release representing the kernel release being vouched for
   * @param amount representing the amount being vouched
   * @param data representing additional information for complex vouching models
   */
  function vouch(address voucher, address release, uint256 amount, bytes data) public onlyOwner {
    _totalVouched = _totalVouched.add(amount);
    _releaseVouches[release] = _releaseVouches[release].add(amount);
    _stakerVouches[voucher][release] = _stakerVouches[voucher][release].add(amount);

    emit Vouched(voucher, release, amount, _releaseVouches[release], data);
  }

  /**
   * @dev Unvouches a given amount for a given kernel release and emits the corresponding event
   * @param voucher representing the voucher address
   * @param release representing the kernel release being unvouched for
   * @param amount representing the amount being unvouched
   * @param data representing additional information for complex vouching models
   */
  function unvouch(address voucher, address release, uint256 amount, bytes data) public onlyOwner {
    uint256 currentVouch = _stakerVouches[voucher][release];
    require(currentVouch >= amount);

    _totalVouched = totalVouched().sub(amount);
    _releaseVouches[release] = _releaseVouches[release].sub(amount);
    _stakerVouches[voucher][release] = currentVouch.sub(amount);

    emit Unvouched(voucher, release, amount, _releaseVouches[release], data);
  }
}
