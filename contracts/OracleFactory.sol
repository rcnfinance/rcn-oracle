pragma solidity ^0.5.10;

import "./MultiSourceOracle.sol";
import "./commons/Ownable.sol";


contract OracleFactory is Ownable {
    mapping(string => address) public symbolToOracle;
    mapping(address => string) public oracleToSymbol;

    event NewOracle(string _symbol, address _oracle);

    function newOracle(string calldata _symbol) external onlyOwner {
        // Create oracle contract
        MultiSourceOracle oracle = new MultiSourceOracle();
        // Save Oracle in registry
        symbolToOracle[_symbol] = address(oracle);
        oracleToSymbol[address(oracle)] = _symbol;
        // Emit events
        emit NewOracle(_symbol, address(oracle));
    }

    function addSigner(address _oracle, address _signer) external onlyOwner {
        MultiSourceOracle(_oracle).addSigner(_signer);
    }

    function removeSigner(address _oracle, address _signer) external onlyOwner {
        MultiSourceOracle(_oracle).removeSigner(_signer);
    }

    function provide(address _oracle, uint256 _rate) external {
        MultiSourceOracle(_oracle).provide(msg.sender, _rate);
    }

    function provideMultiple(bytes32[] calldata _data) external {
        for (uint256 i = 0; i < _data.length; i++) {
            (address oracle, uint256 rate) = _decode(_data[i]);
            MultiSourceOracle(oracle).provide(msg.sender, rate);
        }
    }

    function _decode(bytes32 _entry) private pure returns (address _addr, uint256 _value) {
        /* solium-disable-next-line */
        assembly {
            _addr := and(_entry, 0xffffffffffffffffffffffffffffffffffffffff)
            _value := shr(160, _entry)
        }
    }
}
