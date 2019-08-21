pragma solidity ^0.5.10;

import "./MultiSourceOracle.sol";
import "./interfaces/RateOracle.sol";
import "./interfaces/PausedProvider.sol";
import "./commons/Ownable.sol";
import "./commons/Pausable.sol";


contract OracleFactory is Ownable, Pausable, PausedProvider {
    mapping(string => address) public symbolToOracle;
    mapping(address => string) public oracleToSymbol;

    event NewOracle(
        string _symbol,
        address _oracle,
        string _name,
        uint256 _decimals,
        address _token,
        string _maintainer
    );

    function newOracle(
        string calldata _symbol,
        string calldata _name,
        uint256 _decimals,
        address _token,
        string calldata _maintainer
    ) external onlyOwner {
        // Create oracle contract
        MultiSourceOracle oracle = new MultiSourceOracle(
            _symbol,
            _name,
            _decimals,
            _token,
            _maintainer
        );
        // Save Oracle in registry
        symbolToOracle[_symbol] = address(oracle);
        oracleToSymbol[address(oracle)] = _symbol;
        // Emit events
        emit NewOracle(
            _symbol,
            address(oracle),
            _name,
            _decimals,
            _token,
            _maintainer
        );
    }

    function isPaused() external view returns (bool) {
        return paused;
    }

    function addSigner(address _oracle, address _signer, string calldata _name) external onlyOwner {
        MultiSourceOracle(_oracle).addSigner(_signer, _name);
    }

    function setName(address _oracle, address _signer, string calldata _name) external onlyOwner {
        MultiSourceOracle(_oracle).setName(_signer, _name);
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

    function setUpgrade(address _oracle, address _upgrade) external onlyOwner {
        MultiSourceOracle(_oracle).setUpgrade(RateOracle(_upgrade));
    }

    function setMetadata(
        address _oracle,
        string calldata _name,
        uint256 _decimals,
        string calldata _maintainer
    ) external onlyOwner {
        MultiSourceOracle(_oracle).setMetadata(
            _name,
            _decimals,
            _maintainer
        );
    }

    function _decode(bytes32 _entry) private pure returns (address _addr, uint256 _value) {
        /* solium-disable-next-line */
        assembly {
            _addr := and(_entry, 0xffffffffffffffffffffffffffffffffffffffff)
            _value := shr(160, _entry)
        }
    }
}
