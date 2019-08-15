pragma solidity ^0.5.10;

import "./commons/Ownable.sol";
import "./commons/AddressHeap.sol";
import "./interfaces/RateOracle.sol";
import "./interfaces/UpgradeProvider.sol";


contract MultiSourceOracle is Ownable {
    using AddressHeap for AddressHeap.Heap;

    uint256 public constant BASE = 10 ** 18;

    event Upgraded(address _prev, address _new);

    mapping(address => bool) public isSigner;
    AddressHeap.Heap private topProposers;
    AddressHeap.Heap private botProposers;

    RateOracle public upgrade;

    constructor() public {
        topProposers.initialize(true);
        botProposers.initialize(false);
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

    function addSigner(address _signer) external onlyOwner {
        require(!isSigner[_signer], "signer already defined");
        isSigner[_signer] = true;
    }

    function removeSigner(address _signer) external onlyOwner {
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
