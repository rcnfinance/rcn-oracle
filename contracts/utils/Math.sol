pragma solidity ^0.5.11;


library Math {
    function average(uint256 a, uint256 b) private pure returns (uint256) {
        // (a + b) / 2 can overflow, so we distribute
        return (a / 2) + (b / 2) + ((a % 2 + b % 2) / 2);
    }
}
