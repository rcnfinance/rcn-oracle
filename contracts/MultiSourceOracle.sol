pragma solidity ^0.5.10;

import "./commons/Ownable.sol";
import "./commons/SortedStructList.sol";
import "./interfaces/RateOracle.sol";


contract MultiSourceOracle is SortedStructList, RateOracle, Ownable {

    event SetName(string _prev, string _new);
    event SetMaintainer(string _prev, string _new);

    uint256 public constant BASE = 10 ** 18;


    mapping(address => uint256) private signers;

    mapping(address => bool) public isSigner;

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
        bytes32 _currency,
        string memory _maintainer
    ) public {
        isymbol = _symbol;
        iname = _name;
        idecimals = _decimals;
        itoken = _token;
        icurrency = _currency;
        imaintainer = _maintainer;
        emit SetName("", _name);
        emit SetMaintainer("", _maintainer);
    }

    function readSample(bytes calldata) external view returns (uint256, uint256) {
        return _readSample();
    }

    function readSample() external view returns (uint256, uint256) {
        return _readSample();
    }

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

    function getProvided(address _addr) external view returns (
        uint256 _rate,
        uint256 _index
    ) {
        return (nodes[id], id);
    }

    function setName(string calldata _name) external onlyOwner {
        emit SetName(iname, _name);
        iname = _name;
    }

    function setMaintainer(string calldata _maintainer) external onlyOwner {
        emit SetMaintainer(imaintainer, _maintainer);
        imaintainer = _maintainer;
    }

    function addSigner(address _signer) external onlyOwner {
        require(!isSigner[_signer], "signer already defined");
        isSigner[_signer] = true;
    }

    function removeSigner(address _signer) external onlyOwner {

        isSigner[_signer] = false;
        this.remove(signers[_signer]);
        signers[_signer] = 0;

    }

    function provide(address _signer, uint256 _rate) external onlyOwner {

        require(isSigner[_signer], "signer not valid");
        require(_rate > 0, "rate can't be zero");
        require(_rate < uint96(uint256(-1)), "rate too high");
        
        uint256 id = this.newNode(_signer, _rate);
        signers[_signer] = id;
        this.insert(id);

    }

    function _readSample() private view returns (uint256 _tokens, uint256 _equivalent) {
        // Tokens is always base
        _tokens = BASE;
        _equivalent = this.median();
    }
}
