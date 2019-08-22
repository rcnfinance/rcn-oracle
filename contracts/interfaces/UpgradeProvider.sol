pragma solidity ^0.5.11;


interface UpgradeProvider {
    function upgradedContract() external view returns (address);
}
