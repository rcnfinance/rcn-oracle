pragma solidity ^0.5.10;

import "./commons/Ownable.sol";
import "./commons/AddressHeap.sol";
import "./interfaces/RateOracle.sol";
import "./interfaces/PausedProvider.sol";
import "./utils/StringUtils.sol";


contract MultiSourceOracle is RateOracle, Ownable {
    using AddressHeap for AddressHeap.Heap;
    using StringUtils for string;

    uint256 public constant BASE = 10 ** 18;

    event Upgraded(address _prev, address _new);
    event AddSigner(address _signer, string _name);
    event UpdateName(address _signer, string _oldName, string _newName);
    event RemoveSigner(address _signer, string _name);
    event UpdatedMetadata(string _name, uint256 _decimals, string _maintainer);

    mapping(address => bool) public isSigner;
    mapping(address => string) public nameOfSigner;
    mapping(string => address) public signerWithName;
    AddressHeap.Heap private topProposers;
    AddressHeap.Heap private botProposers;

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
        // Initialize structure
        topProposers.initialize(true);
        botProposers.initialize(false);
        pausedProvider = PausedProvider(msg.sender);
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

    function getProvided(address _addr) external view returns (
        bool _topHeap,
        bool _botHeap,
        uint256 _rate,
        uint256 _indexHeap
    ) {
        _topHeap = topProposers.has(_addr);
        _botHeap = botProposers.has(_addr);

        if (_topHeap) {
            (_indexHeap, _rate) = topProposers.getAddr(_addr);
        } else if (_botHeap) {
            (_indexHeap, _rate) = botProposers.getAddr(_addr);
        }
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
        emit RemoveSigner(_signer, signerName);
        signerWithName[signerName] = address(0);

        if (isSigner[_signer]) {
            isSigner[_signer] = false;
        }

        if (topProposers.has(_signer)) {
            // Send to bottom and pop
            topProposers.update(_signer, 0);
            topProposers.popTop();
        } else if (botProposers.has(_signer)) {
            // Send to top and pop
            botProposers.update(_signer, uint96(uint256(-1)));
            botProposers.popTop();
        }

        uint256 topSize = topProposers.size();
        uint256 botSize = botProposers.size();

        if (topSize != botSize) {
            if (topSize > botSize + 1) {
                (address topAddr, uint256 topValue) = topProposers.top();
                topProposers.popTop();
                botProposers.insert(topAddr, topValue);
            } else if (botSize > topSize + 1) {
                (address botAddr, uint256 botValue) = botProposers.top();
                botProposers.popTop();
                topProposers.insert(botAddr, botValue);
            }
        }

        _equilibrate();
    }

    function provide(address _signer, uint256 _rate) external onlyOwner {
        require(isSigner[_signer], "signer not valid");
        require(_rate != 0, "rate can't be zero");
        require(_rate < uint96(uint256(-1)), "rate too high");

        if (topProposers.has(_signer)) {
            topProposers.update(_signer, _rate);
        } else if (botProposers.has(_signer)) {
            botProposers.update(_signer, _rate);
        } else {
            _insert(_signer, _rate);
        }

        _equilibrate();
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

        uint256 topSize = topProposers.size();
        uint256 botSize = botProposers.size();

        if (topSize > botSize) {
            (, _equivalent) = topProposers.top();
        } else if (botSize > topSize) {
            (, _equivalent) = botProposers.top();
        } else {
            // Calculate equivalent
            (, uint256 topValue) = topProposers.top();
            (, uint256 botValue) = botProposers.top();
            _equivalent = (topValue + botValue) / 2;
        }
    }

    function _insert(address _signer, uint256 _rate) private {
        uint256 topSize = topProposers.size();
        uint256 botSize = botProposers.size();

        if (botSize < topSize) {
            botProposers.insert(_signer, _rate);
        } else {
            topProposers.insert(_signer, _rate);
        }
    }

    function _equilibrate() private {
        (address topAddr, uint256 topValue) = topProposers.top();
        (address botAddr, uint256 botValue) = botProposers.top();

        if (topAddr == address(0) || botAddr == address(0)) {
            return;
        }

        if (topValue < botValue) {
            // Swap tops
            topProposers.popTop();
            botProposers.popTop();
            // Insert reverted
            topProposers.insert(botAddr, botValue);
            botProposers.insert(topAddr, topValue);
        }
    }
}
