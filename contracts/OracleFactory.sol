pragma solidity ^0.5.10;

import "./MultiSourceOracle.sol";
import "./commons/Ownable.sol";
import "./utils/StringUtils.sol";


contract OracleFactory is Ownable {
    using StringUtils for string;

    mapping(string => address) public symbolToOracle;
    mapping(address => string) public oracleToSymbol;

    event NewOracle(string _symbol, address _oracle);
    event AddSigner(address _oracle, address _signer);
    event RemoveSigner(address _oracle, address _signer);
    event Provide(address _oracle, address _signer, uint256 _rate);

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
            _symbol.toBytes32(),
            _maintainer
        );

        // Save Oracle in registry
        symbolToOracle[_symbol] = address(oracle);
        oracleToSymbol[address(oracle)] = _symbol;
        // Emit events
        emit NewOracle(_symbol, address(oracle));
    }

    function addSigner(address _oracle, address _signer) external onlyOwner {
        MultiSourceOracle(_oracle).addSigner(_signer);
        emit AddSigner(_oracle, _signer);
    }

    function removeSigner(address _oracle, address _signer) external onlyOwner {
        MultiSourceOracle(_oracle).removeSigner(_signer);
        emit RemoveSigner(_oracle, _signer);
    }

    function setName(address _oracle, string calldata _name) external onlyOwner {
        MultiSourceOracle(_oracle).setName(_name);
    }

    function setMaintainer(address _oracle, string calldata _maintainer) external onlyOwner {
        MultiSourceOracle(_oracle).setMaintainer(_maintainer);
    }

    function provide(address _oracle, uint256 _rate) external {
        MultiSourceOracle(_oracle).provide(msg.sender, _rate);
        emit Provide(_oracle, msg.sender, _rate);
    }

}
