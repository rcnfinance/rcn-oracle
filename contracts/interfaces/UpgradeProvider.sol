pragma solidity ^0.5.10;


interface UpgradeProvider {
    function upgradedContract() external view returns (address);
}
