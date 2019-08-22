pragma solidity ^0.5.11;


interface PausedProvider {
    function isPaused() external view returns (bool);
}
