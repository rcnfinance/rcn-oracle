pragma solidity ^0.5.10;


interface PausedProvider {
    function isPaused() external view returns (bool);
}
