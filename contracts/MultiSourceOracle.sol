pragma solidity ^0.5.10;

import "./commons/Ownable.sol";
import "sorted-collection/SortedList.sol";
import "sorted-collection/SortedListDelegate.sol";
import "./interfaces/RateOracle.sol";
import "./interfaces/UpgradeProvider.sol";


contract MultiSourceOracle is Ownable, SortedListDelegate {

    using SortedList for SortedList.List;
    uint256 public constant BASE = 10 ** 18;
    uint256 public internalId = 0;

    event Upgraded(address _prev, address _new);
    event AddSigner(address _signer, string _name);
    event UpdateName(address _signer, string _oldName, string _newName);
    event RemoveSigner(address _signer, string _name);

    mapping(uint256 => uint256) internal nodes;
    mapping(address => bool) public isSigner;
    mapping(address => string) public nameOfSigner;
    mapping(string => address) public signerWithName;
    mapping(address => uint256) private signerWithNode;

    
    SortedList.List private list;
    RateOracle public upgrade;

    constructor() public {}

    function getProvided(address _addr) external view returns (uint256 _rate, uint256 _index) {
        uint256 id = signerWithNode[_addr];
        return (this.getValue(id), id);
    }

    function setUpgrade(RateOracle _upgrade) external onlyOwner {
        emit Upgraded(address(upgrade), address(_upgrade));
        upgrade = _upgrade;
    }

    function addSigner(address _signer, string calldata _name) external onlyOwner {
        require(!isSigner[_signer], "signer already defined");
        require(signerWithName[_name] == address(0), "name already in use");
        require(bytes(_name).length > 0, "name can't be empty");
        isSigner[_signer] = true;
        signerWithName[_name] = _signer;
        nameOfSigner[_signer] = _name;
        emit AddSigner(_signer, _name);
    }

    function setName(address _signer, string calldata _name) external onlyOwner {
        require(isSigner[_signer], "signer not defined");
        require(signerWithName[_name] == address(0), "name already in use");
        require(bytes(_name).length > 0, "name can't be empty");
        string memory oldName = nameOfSigner[_signer];
        emit UpdateName(_signer, oldName, _name);
        signerWithName[oldName] = address(0);
        signerWithName[_name] = _signer;
        nameOfSigner[_signer] = _name;
    }

    function removeSigner(address _signer) external onlyOwner {
        
        string memory name = nameOfSigner[_signer];
        if (!isSigner[_signer]) {
            return;
        }
        
        isSigner[_signer] = false;
        signerWithName[name] = address(0);
        uint256 id = signerWithNode[_signer];
        list.remove(id);
        emit RemoveSigner(_signer, name);

    }

    function provide(address _signer, uint256 _rate) external onlyOwner {
        require(isSigner[_signer], "signer not valid");
        require(_rate != 0, "rate can't be zero");
        require(_rate < uint96(uint256(-1)), "rate too high");

        uint256 id = newNode(_rate);
        signerWithNode[_signer] = id;
        list.insert(id, address(this));
    }

    function readSample(bytes calldata) external view returns (uint256, uint256) {
        return readSample();
    }

    function readSample() public view returns (uint256 _tokens, uint256 _equivalent) {
        // Check if Oracle contract has been upgraded
        RateOracle _upgrade = upgrade;
        if (address(_upgrade) != address(0)) {
            return _upgrade.readSample(new bytes(0));
        }

        // Tokens is always base
        _tokens = BASE;
        _equivalent = list.median(address(this));
    }

    function getValue(uint256 id) external view returns (uint256) {
        return nodes[id];
    }

    function newNode(uint256 _value) private returns (uint256) {
        internalId = internalId + 1;
        nodes[internalId] = _value;
        return internalId;
    }

}
