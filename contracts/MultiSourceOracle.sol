pragma solidity ^0.5.10;

import "./commons/Ownable.sol";
import "../installed_contracts/sorted-collection/contracts/SortedList.sol";
import "../installed_contracts/sorted-collection/contracts/SortedListDelegate.sol";
import "./interfaces/RateOracle.sol";
import "./interfaces/PausedProvider.sol";
import "./utils/StringUtils.sol";
import "./utils/StringUtils.sol";


contract MultiSourceOracle is RateOracle, Ownable, SortedListDelegate {
    using SortedList for SortedList.List;
    using StringUtils for string;

    uint256 public constant BASE = 10 ** 18;

    event Upgraded(address _prev, address _new);
    event AddSigner(address _signer, string _name);
    event UpdateName(address _signer, string _oldName, string _newName);
    event RemoveSigner(address _signer, string _name);
    event UpdatedMetadata(string _name, uint256 _decimals, string _maintainer);

    mapping(address => bool) public isSigner;
    mapping(address => uint256) internal providedBy;
    mapping(address => string) public nameOfSigner;
    mapping(string => address) public signerWithName;

    SortedList.List private list;
    RateOracle public upgrade;
    PausedProvider public pausedProvider;

    string private isymbol;
    string private iname;
    uint256 private idecimals;
    address private itoken;
    bytes32 private icurrency;
    string private imaintainer;

    constructor(
        string memory _symbol,
        string memory _name,
        uint256 _decimals,
        address _token,
        string memory _maintainer
    ) public {
        // Create legacy bytes32 currency
        bytes32 currency = _symbol.toBytes32();
        // Save Oracle metadata
        isymbol = _symbol;
        iname = _name;
        idecimals = _decimals;
        itoken = _token;
        icurrency = currency;
        imaintainer = _maintainer;
        pausedProvider = PausedProvider(msg.sender);
    }

    // Implemented for SortedListDelegate
    function getValue(uint256 _id) external view returns (uint256) {
        return providedBy[address(_id)];
    }

    // Oracle metadata interface
    function symbol() external view returns (string memory) {
        return isymbol;
    }

    function name() external view returns (string memory) {
        return iname;
    }

    function decimals() external view returns (uint256) {
        return idecimals;
    }

    function token() external view returns (address) {
        return itoken;
    }

    function currency() external view returns (bytes32) {
        return icurrency;
    }

    function maintainer() external view returns (string memory) {
        return imaintainer;
    }

    function url() external view returns (string memory) {
        return "";
    }

    function setMetadata(
        string calldata _name,
        uint256 _decimals,
        string calldata _maintainer
    ) external onlyOwner {
        iname = _name;
        idecimals = _decimals;
        imaintainer = _maintainer;
        emit UpdatedMetadata(
            _name,
            _decimals,
            _maintainer
        );
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
        string memory signerName = nameOfSigner[_signer];
        if (!isSigner[_signer]) {
            return;
        }

        isSigner[_signer] = false;
        signerWithName[signerName] = address(0);
        list.remove(uint256(_signer));
        emit RemoveSigner(_signer, signerName);
    }

    function provide(address _signer, uint256 _rate) external onlyOwner {
        require(isSigner[_signer], "signer not valid");
        require(_rate != 0, "rate can't be zero");
        require(_rate < uint96(uint256(-1)), "rate too high");

        uint256 node = uint256(_signer);
        if (list.exists(node)) {
            list.remove(node);
        }

        providedBy[_signer] = _rate;
        list.insert(node, address(this));
    }

    function readSample(bytes calldata) external view returns (uint256, uint256) {
        return readSample();
    }

    function readSample() public view returns (uint256 _tokens, uint256 _equivalent) {
        // Check if paused
        require(!pausedProvider.isPaused(), "contract paused");

        // Check if Oracle contract has been upgraded
        RateOracle _upgrade = upgrade;
        if (address(_upgrade) != address(0)) {
            return _upgrade.readSample(new bytes(0));
        }

        // Tokens is always base
        _tokens = BASE;
        _equivalent = list.median(address(this));
    }
}
