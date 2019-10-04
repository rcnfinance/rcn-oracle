pragma solidity ^0.5.12;


interface UpgradeProvider {
    function upgradedContract() external view returns (address);
}
