pragma solidity ^0.5.11;

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

    event Upgraded(
        address indexed _oracle,
        address _new
    );

    event AddSigner(
        address indexed _oracle,
        address _signer,
        string _name
    );

    event RemoveSigner(
        address indexed _oracle,
        address _signer
    );

    event UpdateSignerName(
        address indexed _oracle,
        address _signer,
        string _newName
    );

    event UpdatedMetadata(
        address indexed _oracle,
        string _name,
        uint256 _decimals,
        string _maintainer
    );

    event Provide(
        address indexed _oracle,
        address _signer,
        uint256 _rate
    );

    event OraclePaused(
        address indexed _oracle,
        address _pauser
    );

    event OracleStarted(
        address indexed _oracle
    );

    /**
     * @dev Creates a new Oracle contract for a given `_symbol`
     * @param _symbol metadata symbol for the currency of the oracle to create
     * @param _name metadata name for the currency of the oracle
     * @param _decimals metadata number of decimals to express the common denomination of the currency
     * @param _token metadata token address of the currency
     *   (if the currency has no token, it should be the address 0)
     * @param _maintainer metadata maintener human readable name
     * @notice Only one oracle by symbol can be created
     */
    function newOracle(
        string calldata _symbol,
        string calldata _name,
        uint256 _decimals,
        address _token,
        string calldata _maintainer
    ) external onlyOwner {
        // Check for duplicated oracles
        require(symbolToOracle[_symbol] == address(0), "Oracle already exists");
        // Create oracle contract
        MultiSourceOracle oracle = new MultiSourceOracle(
            _symbol,
            _name,
            _decimals,
            _token,
            _maintainer
        );
        // Sanity check new oracle
        assert(bytes(oracleToSymbol[address(oracle)]).length == 0);
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

    /**
     * @return true if the Oracle ecosystem is paused
     * @notice Used by PausedProvided and readed by the Oracles on each `readSample()`
     */
    function isPaused() external view returns (bool) {
        return paused;
    }

    /**
     * @dev Adds a `_signer` to a given `_oracle`
     * @param _oracle Address of the oracle on which add the `_signer`
     * @param _signer Address of the signer to be added
     * @param _name Human readable metadata name of the `_signer`
     * @notice Acts as a proxy of `_oracle.addSigner`
     */
    function addSigner(address _oracle, address _signer, string calldata _name) external onlyOwner {
        MultiSourceOracle(_oracle).addSigner(_signer, _name);
        emit AddSigner(_oracle, _signer, _name);
    }

    /**
     * @dev Adds a `_signer` to multiple `_oracles`
     * @param _oracles List of oracles on which add the `_signer`
     * @param _signer Address of the signer to be added
     * @param _name Human readable metadata name of the `_signer`
     * @notice Acts as a proxy for all the `_oracles` `_oracle.addSigner`
     */
    function addSignerToOracles(
        address[] calldata _oracles,
        address _signer,
        string calldata _name
    ) external onlyOwner {
        for (uint256 i = 0; i < _oracles.length; i++) {
            address oracle = _oracles[i];
            MultiSourceOracle(oracle).addSigner(_signer, _name);
            emit AddSigner(oracle, _signer, _name);
        }
    }

    /**
     * @dev Updates the `_name` of a given `_signer`@`_oracle`
     * @param _oracle Address of the oracle on which the `_signer` it's found
     * @param _signer Address of the signer to be updated
     * @param _name Human readable metadata name of the `_signer`
     * @notice Acts as a proxy of `_oracle.setName`
     */
    function setName(address _oracle, address _signer, string calldata _name) external onlyOwner {
        MultiSourceOracle(_oracle).setName(_signer, _name);
        emit UpdateSignerName(
            _oracle,
            _signer,
            _name
        );
    }

    /**
     * @dev Removes a `_signer` to a given `_oracle`
     * @param _oracle Address of the oracle on which remove the `_signer`
     * @param _signer Address of the signer to be removed
     * @notice Acts as a proxy of `_oracle.removeSigner`
     */
    function removeSigner(address _oracle, address _signer) external onlyOwner {
        MultiSourceOracle(_oracle).removeSigner(_signer);
        emit RemoveSigner(_oracle, _signer);
    }


    /**
     * @dev Removes a `_signer` from multiple `_oracles`
     * @param _oracles List of oracles on which remove the `_signer`
     * @param _signer Address of the signer to be removed
     * @notice Acts as a proxy for all the `_oracles` `_oracle.removeSigner`
     */
    function removeSignerFromOracles(
        address[] calldata _oracles,
        address _signer
    ) external onlyOwner {
        for (uint256 i = 0; i < _oracles.length; i++) {
            address oracle = _oracles[i];
            MultiSourceOracle(oracle).removeSigner(_signer);
            emit RemoveSigner(oracle, _signer);
        }
    }

    /**
     * @dev Provides a `_rate` for a given `_oracle`, msg.sener becomes the `signer`
     * @param _oracle Address of the oracle on which provide the rate
     * @param _rate Rate to be provided
     * @notice Acts as a proxy of `_oracle.provide`, using the parameter `msg.sender` as signer
     */
    function provide(address _oracle, uint256 _rate) external {
        MultiSourceOracle(_oracle).provide(msg.sender, _rate);
        emit Provide(_oracle, msg.sender, _rate);
    }

    /**
     * @dev Provides multiple rates for a set of oracles, with the same signer
     *   msg.sender becomes the signer for all the provides
     *
     * @param _oracles List of oracles to provide a rate for
     * @param _rates List of rates to provide
     * @notice Acts as a proxy for multiples `_oracle.provide`, using the parameter `msg.sender` as signer
     */
    function provideMultiple(
        address[] calldata _oracles,
        uint256[] calldata _rates
    ) external {
        uint256 length = _oracles.length;
        require(length == _rates.length, "arrays should have the same size");

        for (uint256 i = 0; i < length; i++) {
            address oracle = _oracles[i];
            uint256 rate = _rates[i];
            MultiSourceOracle(oracle).provide(msg.sender, rate);
            emit Provide(oracle, msg.sender, rate);
        }
    }

    /**
     * @dev Updates the Oracle contract, all subsequent calls to `readSample` will be forwareded to `_upgrade`
     * @param _oracle oracle address to be upgraded
     * @param _upgrade contract address of the new updated oracle
     * @notice Acts as a proxy of `_oracle.setUpgrade`
     */
    function setUpgrade(address _oracle, address _upgrade) external onlyOwner {
        MultiSourceOracle(_oracle).setUpgrade(RateOracle(_upgrade));
        emit Upgraded(_oracle, _upgrade);
    }

    /**
     * @dev Pauses the given `_oracle`
     * @param _oracle oracle address to be paused
     * @notice Acts as a proxy of `_oracle.pause`
     */
    function pauseOracle(address _oracle) external {
        require(
            canPause[msg.sender] ||
            msg.sender == _owner,
            "not authorized to pause"
        );

        MultiSourceOracle(_oracle).pause();
        emit OraclePaused(_oracle, msg.sender);
    }

    /**
     * @dev Starts the given `_oracle`
     * @param _oracle oracle address to be started
     * @notice Acts as a proxy of `_oracle.start`
     */
    function startOracle(address _oracle) external onlyOwner {
        MultiSourceOracle(_oracle).start();
        emit OracleStarted(_oracle);
    }

    /**
     * @dev Updates the medatada of the oracle
     * @param _oracle oracle address to update its metadata
     * @param _name Name of the oracle currency
     * @param _decimals Decimals for the common representation of the currency
     * @param _maintainer Name of the maintainer entity of the Oracle
     * @notice Acts as a proxy of `_oracle.setMetadata`
     */
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

        emit UpdatedMetadata(
            _oracle,
            _name,
            _decimals,
            _maintainer
        );
    }
}
