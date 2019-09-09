pragma solidity ^0.5.11;

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

    /**
     * @return metadata, 3 or 4 letter symbol of the currency provided by this oracle
     *   (ej: ARS)
     * @notice Defined by the RCN RateOracle interface
     */
    function symbol() external view returns (string memory) {
        return isymbol;
    }

    /**
     * @return metadata, full name of the currency provided by this oracle
     *   (ej: Argentine Peso)
     * @notice Defined by the RCN RateOracle interface
     */
    function name() external view returns (string memory) {
        return iname;
    }

    /**
     * @return metadata, decimals to express the common denomination
     *   of the currency provided by this oracle
     * @notice Defined by the RCN RateOracle interface
     */
    function decimals() external view returns (uint256) {
        return idecimals;
    }

    /**
     * @return metadata, token address of the currency provided by this oracle
     * @notice Defined by the RCN RateOracle interface
     */
    function token() external view returns (address) {
        return itoken;
    }

    /**
     * @return metadata, bytes32 code of the currency provided by this oracle
     * @notice Defined by the RCN RateOracle interface
     */
    function currency() external view returns (bytes32) {
        return icurrency;
    }

    /**
     * @return metadata, human readable name of the entity maintainer of this oracle
     * @notice Defined by the RCN RateOracle interface
     */
    function maintainer() external view returns (string memory) {
        return imaintainer;
    }

    /**
     * @dev Returns the URL required to retrieve the auxiliary data
     *   as specified by the RateOracle spec, no auxiliary data is required
     *   so it returns an empty string.
     * @return An empty string, because the auxiliary data is not required
     * @notice Defined by the RCN RateOracle interface
     */
    function url() external view returns (string memory) {
        return "";
    }

    /**
     * @dev Updates the medatada of the oracle
     * @param _name Name of the oracle currency
     * @param _decimals Decimals for the common representation of the currency
     * @param _maintainer Name of the maintainer entity of the Oracle
     */
    function setMetadata(
        string calldata _name,
        uint256 _decimals,
        string calldata _maintainer
    ) external onlyOwner {
        iname = _name;
        idecimals = _decimals;
        imaintainer = _maintainer;
    }

    /**
     * @dev Updates the Oracle contract, all subsequent calls to `readSample` will be forwareded to `_upgrade`
     * @param _upgrade Contract address of the new updated oracle
     * @notice If the `upgrade` address is set to the address `0` the Oracle is considered not upgraded
     */
    function setUpgrade(RateOracle _upgrade) external onlyOwner {
        upgrade = _upgrade;
    }

    /**
     * @dev Adds a `_signer` who is going to be able to provide a new rate
     * @param _signer Address of the signer
     * @param _name Metadata - Human readable name of the signer
     */
    function addSigner(address _signer, string calldata _name) external onlyOwner {
        require(!isSigner[_signer], "signer already defined");
        require(signerWithName[_name] == address(0), "name already in use");
        require(bytes(_name).length > 0, "name can't be empty");
        isSigner[_signer] = true;
        signerWithName[_name] = _signer;
        nameOfSigner[_signer] = _name;
    }

    /**
     * @dev Updates the `_name` metadata of a given `_signer`
     * @param _signer Address of the signer
     * @param _name Metadata - Human readable name of the signer
     */
    function setName(address _signer, string calldata _name) external onlyOwner {
        require(isSigner[_signer], "signer not defined");
        require(signerWithName[_name] == address(0), "name already in use");
        require(bytes(_name).length > 0, "name can't be empty");
        string memory oldName = nameOfSigner[_signer];
        signerWithName[oldName] = address(0);
        signerWithName[_name] = _signer;
        nameOfSigner[_signer] = _name;
    }

    /**
     * @dev Removes an existing `_signer`, removing any provided rate
     * @param _signer Address of the signer
     */
    function removeSigner(address _signer) external onlyOwner {
        string memory signerName = nameOfSigner[_signer];
        if (!isSigner[_signer]) {
            return;
        }

        isSigner[_signer] = false;
        signerWithName[signerName] = address(0);
        list.remove(uint256(_signer));
    }

    /**
     * @dev Provides a `_rate` for a given `_signer`
     * @param _signer Address of the signer who is providing the rate
     * @param _rate Rate to be provided
     * @notice This method can only be called by the Owner and not by the signer
     *   this is intended to allow the `OracleFactory.sol` to provide multiple rates
     *   on a single call. The `OracleFactory.sol` contract has the responsability of
     *   validating the signer address.
     */
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

    /**
     * @dev Reads the rate provided by the Oracle
     *   this being the median of the last rate provided by each signer
     * @param _oracleData Oracle auxiliar data defined in the RCN Oracle spec
     *   not used for this oracle, but forwarded in case of upgrade.
     * @return `_equivalent` is the median of the values provided by the signer
     *   `_tokens` are equivalent to `_equivalent` in the currency of the Oracle
     */
    function readSample(bytes memory _oracleData) public view returns (uint256 _tokens, uint256 _equivalent) {
        // Check if paused
        require(!pausedProvider.isPaused(), "contract paused");

        // Check if Oracle contract has been upgraded
        RateOracle _upgrade = upgrade;
        if (address(_upgrade) != address(0)) {
            return _upgrade.readSample(_oracleData);
        }

        // Tokens is always base
        _tokens = BASE;
        _equivalent = list.median(address(this));
    }

    /**
     * @dev Reads the rate provided by the Oracle
     *   this being the median of the last rate provided by each signer
     * @return `_equivalent` is the median of the values provided by the signer
     *   `_tokens` are equivalent to `_equivalent` in the currency of the Oracle
     * @notice This Oracle accepts reading the sample without auxiliary data
     */
    function readSample() external view returns (uint256 _tokens, uint256 _equivalent) {
        (_tokens, _equivalent) = readSample(new bytes(0));
    }
}
