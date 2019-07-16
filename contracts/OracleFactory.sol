pragma solidity ^0.5.10;

import "./MultiSourceOracle.sol";
import "./commons/Ownable.sol";


contract OracleFactory is Ownable {
    mapping(bytes32 => address) public currencyToOracle;
    mapping(address => bytes32) public oracleToCurrency;

    event NewOracle(string _symbol, bytes32 _currency, address _oracle);

    function newOracle(string calldata _symbol) external onlyOwner {
        MultiSourceRateOracle oracle = new MultiSourceRateOracle();
        bytes32 currency = abi.decode(bytes(_symbol), (bytes32));
        currencyToOracle[currency] = address(oracle);
        oracleToCurrency[address(oracle)] = currency;
        emit NewOracle(_symbol, currency, address(oracle));
    }

    function addSigner(address _oracle, address _signer) external onlyOwner {
        MultiSourceRateOracle(_oracle).addSigner(_signer);
    }

    function provide(address _oracle, uint256 _rate) external {
        MultiSourceRateOracle(_oracle).provide(msg.sender, _rate);
    }

    function provideMultiple(bytes32[] calldata _data) external {
        for (uint256 i = 0; i < _data.length; i++) {
            (address oracle, uint256 rate) = _decode(_data[i]);
            MultiSourceRateOracle(oracle).provide(msg.sender, rate);
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
