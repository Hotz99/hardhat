// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IConsentManager {
    function grantConsent(
        address lender,
        bytes32[] calldata scopes,
        uint256 durationDays
    ) external returns (uint256 consentId);

    function revokeAllConsents(address lender) external;

    function revokeConsentById(uint256 consentId) external;

    function checkConsent(
        address borrower,
        bytes32 scope
    ) external returns (bool);

    function isConsentValid(uint256 consentId) external view returns (bool);

    // ---------------------------------------------
    // Accessors
    // ---------------------------------------------

    function getScopes(
        uint256 consentId
    ) external view returns (bytes32[] memory);


    function getConsentCount() external view returns (uint256);

    function getBorrowerConsents(
        address borrower
    ) external view returns (uint256[] memory);
}

/**
 * @title ConsentManager
 * @notice Manages borrower consent grants and validates authorization requests from lenders
 * @dev Implements scope-based consent with expiry times and revocation capability
 */
contract ConsentManager is IConsentManager{
    struct Consent {
        address borrower;
        address lender;
        // hashed scope identifiers
        // e.g.: keccak256(abi.encodePacked("credit_score", "income_bracket", ...))
        bytes32[] scopes;
        uint256 startBlockTime;
        uint256 expiryBlockTime;
        bool isRevoked;
    }

    Consent[] public consents;

    // consentId => borrowerAddress
    mapping(uint256 => address) public consentToBorrower;

    // borrowerAddress => consentCount
    mapping(address => uint256) borrowerConsentCount;

    event ConsentGranted(
        uint256 indexed consentId,
        address indexed borrower,
        address indexed lender,
        bytes32[] scopes,
        uint256 startBlockTime,
        uint256 expiryBlockTime
    );

    event ConsentRevoked(
        uint256 indexed consentId,
        address indexed borrower,
        address indexed lender
    );

    event ConsentQueried(
        uint256 indexed consentId,
        address indexed querier,
        bool authorized
    );

    error UnauthorizedRevocation();
    error ConsentAlreadyRevoked();
    error ConsentExpired();
    error ConsentNotFound();

    /**
     * @notice Grant consent to a lender for multiple scopes and duration
     * @param lender Address of the lender receiving consent
     * @param scopes Array of hashed scope identifiers (e.g., keccak256(abi.encodePacked("credit_score")))
     * @param durationSeconds Duration in seconds for which consent is valid
     * @return consentId Unique identifier for this consent grant
     */
    function grantConsent(
        address lender,
        bytes32[] calldata scopes,
        uint256 durationSeconds
    ) external returns (uint256 consentId) {
        require(lender != address(0), "Invalid lender address");
        require(scopes.length > 0, "At least one scope required");
        require(durationSeconds > 0, "Duration must be positive");

        // Validate no zero scopes
        for (uint256 i = 0; i < scopes.length; i++) {
            require(scopes[i] != bytes32(0), "Invalid scope");
        }

        uint256 startBlockTime = block.timestamp;
        uint256 expiryBlockTime = block.timestamp + durationSeconds;

        consents.push(
            Consent({
                borrower: msg.sender,
                lender: lender,
                scopes: scopes,
                startBlockTime: startBlockTime,
                expiryBlockTime: expiryBlockTime,
                isRevoked: false
            })
        );

        consentId = consents.length - 1;

        consentToBorrower[consentId] = msg.sender;
        borrowerConsentCount[msg.sender]++;

        emit ConsentGranted(
            consentId,
            msg.sender,
            lender,
            scopes,
            startBlockTime,
            expiryBlockTime
        );
    }

    /**
     * @notice Check if a specific consent is currently valid
     * @param consentId The consent identifier to check
     * @return bool True if consent exists, is not revoked, and not expired
     */
    function isConsentValid(uint256 consentId) external view returns (bool) {
        Consent storage consent = consents[consentId];

        if (consent.borrower == address(0)) {
            return false; // Consent doesn't exist
        }

        if (consent.isRevoked) {
            return false; // Consent was revoked
        }

        if (block.timestamp > consent.expiryBlockTime) {
            return false; // Consent expired
        }

        return true;
    }

    function getBorrowerConsents(
        address borrower
    ) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](borrowerConsentCount[borrower]);
        uint256 counter = 0;
        for (uint256 i = 0; i < consents.length; i++) {
            if (consentToBorrower[i] == borrower) {
                result[counter] = i;
                counter++;
            }
        }
        return result;
    }

    function _getBorrowerConsents(
        address borrower
    ) internal view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](borrowerConsentCount[borrower]);
        uint256 counter = 0;
        for (uint256 i = 0; i < consents.length; i++) {
            if (consentToBorrower[i] == borrower) {
                result[counter] = i;
                counter++;
            }
        }
        return result;
    }

    /**
     * @notice Check authorization for a lender to access borrower's data with specific scope
     * @dev Called by OffChainStore to validate consent before returning encrypted data
     * @param borrower Address of the data owner
     * @param scope The scope being requested
     * @return bool True if valid consent exists from borrower to caller with requested scope
     */
    function checkConsent(
        address borrower,
        bytes32 scope
    ) external returns (bool) {
        address lender = msg.sender;
        uint256[] memory borrowerConsents = _getBorrowerConsents(borrower);

        for (uint256 i = 0; i < borrowerConsents.length; i++) {
            uint256 consentId = borrowerConsents[i];
            Consent memory consent = consents[consentId];

            if (
                consent.lender != lender ||
                consent.isRevoked ||
                block.timestamp > consent.expiryBlockTime
            ) {
                continue;
            }

            bool scopeFound = false;
            for (uint256 j = 0; j < consent.scopes.length; j++) {
                if (consent.scopes[j] == scope) {
                    scopeFound = true;
                    break;
                }
            }

            if (scopeFound) {
                emit ConsentQueried(consentId, lender, true);
                return true;
            }

            emit ConsentQueried(uint256(0), lender, false);
            return false;
        }
    }

    /**
     * @notice Revoke all consents granted to a specific lender
     * @param lender Address of the lender whose consents should be revoked
     */
    function revokeAllConsents(address lender) external {
        require(lender != address(0), "Invalid lender address");

        uint256[] memory userConsents = _getBorrowerConsents(msg.sender);

        for (uint256 i = 0; i < userConsents.length; i++) {
            uint256 consentId = userConsents[i];
            Consent storage consent = consents[consentId];

            if (consent.lender == lender && !consent.isRevoked) {
                consent.isRevoked = true;
                emit ConsentRevoked(consentId, msg.sender, lender);
            }
        }
    }

    /**
     * @notice Revoke a specific consent by ID
     * @param consentId The unique identifier of the consent to revoke
     */
    function revokeConsentById(uint256 consentId) external {
        Consent storage consent = consents[consentId];

        if (consent.borrower == address(0)) {
            revert ConsentNotFound();
        }

        if (consent.borrower != msg.sender) {
            revert UnauthorizedRevocation();
        }

        if (consent.isRevoked) {
            revert ConsentAlreadyRevoked();
        }

        consent.isRevoked = true;
        emit ConsentRevoked(consentId, msg.sender, consent.lender);
    }

    function getScopes(
        uint256 consentId
    ) external view returns (bytes32[] memory) {
        return consents[consentId].scopes;
    }

    function getConsentCount() external view returns (uint256) {
        return consents.length;
    }
}
