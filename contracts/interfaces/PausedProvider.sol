pragma solidity ^0.5.12;


interface PausedProvider {
    function isPaused() external view returns (bool);
}
