pragma solidity ^0.4.18;

import "../ZepCore.sol";

contract MockZepCoreV2 is ZepCore {

  // Duplicate developer payout, because reasons
  function _payoutAndStake(address staker, KernelInstance instance, uint256 amount, bytes data) internal {
    uint256 developerPayout = amount.mul(2).div(developerFraction);
    require(developerPayout > 0);
   
    uint256 stakedAmount = amount.sub(developerPayout);
    stakes().stake(staker, instance, stakedAmount, data);
    token().transfer(instance.developer(), developerPayout);
  }

}
