// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IConsentManager {
    function grantConsent(
        address lender,
        bytes32[] calldata scopes,
        uint256 durationDays
    ) external returns (bytes32 consentId);

    function revokeAllConsents(address lender) external;

    function revokeConsentById(bytes32 consentId) external;

    function checkConsent(
        address borrower,
        bytes32 scope
    ) external view returns (bool);

    function isConsentValid(bytes32 consentId) external view returns (bool);

    // ---------------------------------------------
    // Accessors
    // ---------------------------------------------

    function getScopes(bytes32 consentId)
        external
        view
        returns (bytes32[] memory);

    function getConsents(bytes32 consentId)
        external
        view
        returns (
            address borrower,
            address lender,
            uint256 startBlockTime,
            uint256 expiryBlockTime,
            bool isRevoked
        );

    function getBorrowerConsents(address borrower)
        external
        view
        returns (bytes32[] memory);
}


/**
 * @title ConsentManager
 * @notice Manages borrower consent grants and validates authorization requests from lenders
 * @dev Implements scope-based consent with expiry times and revocation capability
 */
contract ConsentManager {
    struct Consent {
        address borrower;
        address lender;
        // hashed scope identifiers 
        // e.g.: keccak256(abi.encodePacked("credit_score", "income_bracket", ...))
        bytes32[] scopes;
        uint256 startBlockTime;
        uint256 expiryBlockTime;
        bool isRevoked;
        bool isValue;
    }
  
    // borrowerAddress => consentIds[]
    mapping(address => bytes32[]) public borrowerConsents;
    // consentId => Consent
    mapping(bytes32 => Consent) public consents;
    
    event ConsentGranted(
        bytes32 indexed consentId,
        address indexed borrower,
        address indexed lender,
        bytes32[] scopes,
        uint256 startBlockTime,
        uint256 expiryBlockTime
    );
    
    event ConsentRevoked(
        bytes32 indexed consentId,
        address indexed borrower,
        address indexed lender
    );
    
    event ConsentQueried(
        bytes32 indexed consentId,
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
    ) external returns (bytes32 consentId) {
        require(lender != address(0), "Invalid lender address");
        require(scopes.length > 0, "At least one scope required");
        require(durationSeconds > 0, "Duration must be positive");
        
        // Validate no zero scopes
        for (uint256 i = 0; i < scopes.length; i++) {
            require(scopes[i] != bytes32(0), "Invalid scope");
        }
        
        uint256 startBlockTime = block.timestamp;
        uint256 expiryBlockTime = block.timestamp + durationSeconds;
        
        consentId = keccak256(
            abi.encodePacked(
                // `msg.sender` is `borrower`
                msg.sender,
                lender,
                scopes,
                block.timestamp,
                block.timestamp + durationSeconds,
                block.number
            )
        );

        // A Consent has to have a lender that's not address(0)
        // To make sure the Consent being created doesn't exist, we make sure it's lender is the default address(0)
        require(consents[consentId].lender == address(0), "Consent already exists");

        consents[consentId] = Consent({
            borrower: msg.sender,
            lender: lender,
            scopes: scopes,
            startBlockTime: startBlockTime,
            expiryBlockTime: expiryBlockTime,
            isRevoked: false,
            isValue: true
        });
        
        borrowerConsents[msg.sender].push(consentId);
        
        emit ConsentGranted(consentId, msg.sender, lender, scopes, startBlockTime, expiryBlockTime);
    }
    
    /**
     * @notice Check if a specific consent is currently valid
     * @param consentId The consent identifier to check
     * @return bool True if consent exists, is not revoked, and not expired
     */
    function isConsentValid(bytes32 consentId) external view returns (bool) {
        Consent storage consent = consents[consentId];
        
        if (consent.borrower == address(0)) {
            return false;  // Consent doesn't exist
        }
        
        if (consent.isRevoked) {
            return false;  // Consent was revoked
        }
        
        if (block.timestamp > consent.expiryBlockTime) {
            return false;  // Consent expired
        }
        
        return true;
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
        
        for (uint256 i = 0; i < borrowerConsents[borrower].length; i++) {
            bytes32 consentId = borrowerConsents[borrower][i];
            Consent storage consent = consents[consentId];
            
            if (consent.lender != lender || consent.isRevoked || block.timestamp > consent.expiryBlockTime) {
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
        }
        
        // No valid consent found for this scope
        emit ConsentQueried(bytes32(0), lender, false);
        return false;
    }
    
    /**
     * @notice Revoke all consents granted to a specific lender
     * @param lender Address of the lender whose consents should be revoked
     */
    function revokeAllConsents(address lender) external {
        require(lender != address(0), "Invalid lender address");
        
        bytes32[] storage userConsents = borrowerConsents[msg.sender];
        
        for (uint256 i = 0; i < userConsents.length; i++) {
            bytes32 consentId = userConsents[i];
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
    function revokeConsentById(bytes32 consentId) external {
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

    function getScopes(bytes32 consentId) external view returns (bytes32[] memory) {
        return consents[consentId].scopes;
    }

    function getBorrowerConsents(address borrower) external view returns (bytes32[] memory) {
        return borrowerConsents[borrower];
    }
}
