// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ConsentManager.sol";
import "./AuditLog.sol";

/**
 * @title ICreditRegistry
 * @notice Minimal interface defining public on-chain identity attributes.
 * @dev Responsibility boundaries:
 *      - CreditRegistry stores public categorical attributes + hashed commitments to off-chain data.
 *      - ConsentManager performs authorization checks for off-chain sensitive data access.
 *      - Off-chain systems must check consent before serving sensitive data referenced by hashes.
 *      - On-chain attributes are intentionally public; no consent required to read them.
 */
interface ICreditRegistry {
    struct IdentityAttributes {
        address userId;
        bytes32 emailHash;
        string creditTier;
        string incomeBracket;
        string debtRatioBracket;
        uint256 lastUpdated;
    }

    event IdentityAttributesRegistered(
        address indexed userId,
        uint256 unixTimestamp
    );
    event IdentityAttributesUpdated(
        address indexed user,
        uint256 unixTimestamp
    );

    error InvalidConsentManager();
    error UnauthorizedUpdate();
    error IdentityAttributesNotFound();

    /**
     * @notice Register identity attributes (first-time initialization).
     * @dev Must be called by the user whose attributes are being registered.
     */
    function registerIdentityAttributes(
        bytes32 emailHash,
        string calldata creditTier,
        string calldata incomeBracket,
        string calldata debtRatioBracket,
        bytes32 accountReferenceHash
    ) external;

    /**
     * @notice Update existing identity attributes selectively.
     * @dev Only the user may update their own attributes.
     */
    function updateIdentityAttributes(
        bytes32 emailHash,
        string calldata creditTier,
        string calldata incomeBracket,
        string calldata debtRatioBracket
    ) external;

    // ------------------------------
    // Ungated Commitment Access
    // ------------------------------

    // TODO these seem a waste of bytecode, kept for convenience

    /**
     * @notice Return hashed pointer to off-chain data.
     * @dev Off-chain system must perform its own consent check before using this.
     */
    function getAccountReferenceHash(address user)
        external
        view
        returns (bytes32);

    /**
     * @notice Return full on-chain identity metadata.
     * @dev Provides only hashed or categorical values; no raw PII exists on-chain.
     */
    function getIdentityAttributes(address user)
        external
        view
        returns (IdentityAttributes memory);

    /**
     * @notice Query whether a user has registered any identity attributes.
     */
    function hasIdentityAttributes(address user)
        external
        view
        returns (bool);
}


/**
 * @title CreditRegistry
 * @notice Stores public categorical identity attributes and hashed commitments to off-chain sensitive data
 * @dev Categorical tiers (CreditTier, IncomeBracket, DebtRatioBracket) are intentionally coarse, public, and readable
 * @dev Hashed commitments (Email, AccountReference) bind off-chain sensitive data without revealing it
 * @dev Consent enforcement happens at the off-chain boundary; on-chain attributes are public by design
 */
contract CreditRegistry is ICreditRegistry {
    mapping(address => IdentityAttributes) public identityAttributes;
    mapping(address => bytes32) public accountReferenceHashes;  
    ConsentManager public consentManager;
    AuditLog public auditLog;

    /**
     * @notice Constructor to set the ConsentManager address
     * @param _consentManager Address of the ConsentManager contract
     */
    constructor(address _consentManager) {
        require(_consentManager != address(0), "Invalid ConsentManager address");
        consentManager = ConsentManager(_consentManager);
    }

    /**
     * @notice Set the AuditLog contract address
     * @param _auditLog Address of the AuditLog contract
     */
    function setAuditLog(address _auditLog) external {
        require(_auditLog != address(0), "Invalid AuditLog address");
        auditLog = AuditLog(_auditLog);
    }

    /**
     * @notice Register identity attributes for a user (first time)
     * @param emailHash Hashed email address
     * @param creditTier Readable credit tier (e.g., "A", "B", "C")
     * @param incomeBracket Readable income bracket (e.g., "50k-75k", "75k-100k")
     * @param debtRatioBracket Readable debt ratio bracket (e.g., "0-20%", "20-40%")
     * @param accountReferenceHash Hashed pointer to off-chain encrypted data storage
     */
    function registerIdentityAttributes(
        bytes32 emailHash,
        string calldata creditTier,
        string calldata incomeBracket,
        string calldata debtRatioBracket,
        bytes32 accountReferenceHash
    ) external {
        require(emailHash != bytes32(0), "Invalid email hash");
        require(bytes(creditTier).length > 0, "Invalid credit tier");
        require(accountReferenceHash != bytes32(0), "Account reference hash required");
        
        require(identityAttributes[msg.sender].userId == address(0), "Identity attributes already registered");
        
        identityAttributes[msg.sender] = IdentityAttributes({
            userId: msg.sender,
            emailHash: emailHash,
            creditTier: creditTier,
            incomeBracket: incomeBracket,
            debtRatioBracket: debtRatioBracket,
            lastUpdated: block.timestamp
        });
        
        accountReferenceHashes[msg.sender] = accountReferenceHash;
        
        // Log to AuditLog if set
        if (address(auditLog) != address(0)) {
            auditLog.logEvent(IAuditLog.AuditEntry({
                accessorUserId: msg.sender,
                subjectUserId: msg.sender,
                hashedScope: bytes32(0),
                unixTimestamp: block.timestamp,
                eventType: IAuditLog.EventType.IDENTITY_REGISTERED
            }));
        }
        
        emit IdentityAttributesRegistered(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Update existing identity attributes for a user
     * @param emailHash Hashed email address (optional, pass bytes32(0) to skip)
     * @param creditTier Readable credit tier (optional, pass empty string to skip)
     * @param incomeBracket Readable income bracket (optional, pass empty string to skip)
     * @param debtRatioBracket Readable debt ratio bracket (optional, pass empty string to skip)
     */
    function updateIdentityAttributes(
        bytes32 emailHash,
        string calldata creditTier,
        string calldata incomeBracket,
        string calldata debtRatioBracket
    ) external {
        IdentityAttributes storage attrs = identityAttributes[msg.sender];
        
        if (attrs.userId == address(0)) {
            revert IdentityAttributesNotFound();
        }
        
        if (attrs.userId != msg.sender) {
            revert UnauthorizedUpdate();
        }
        
        // update fields
        if (emailHash != bytes32(0)) {
            attrs.emailHash = emailHash;
        }
        if (bytes(creditTier).length > 0) {
            attrs.creditTier = creditTier;
        }
        if (bytes(incomeBracket).length > 0) {
            attrs.incomeBracket = incomeBracket;
        }
        if (bytes(debtRatioBracket).length > 0) {
            attrs.debtRatioBracket = debtRatioBracket;
        }
        
        attrs.lastUpdated = block.timestamp;
        
        // Log to AuditLog if set
        if (address(auditLog) != address(0)) {
            auditLog.logEvent(IAuditLog.AuditEntry({
                accessorUserId: msg.sender,
                subjectUserId: msg.sender,
                hashedScope: bytes32(0),
                unixTimestamp: block.timestamp,
                eventType: IAuditLog.EventType.IDENTITY_UPDATED
            }));
        }
        
        emit IdentityAttributesUpdated(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Get account reference hash for a user
     * @dev Off-chain system MUST verify consent via ConsentManager before using this hash to fetch sensitive data
     * @param user Address of the user
     * @return Account reference hash
     */
    function getAccountReferenceHash(address user) external view returns (bytes32) {
        return accountReferenceHashes[user];
    }
    
    /**
     * @notice Get complete identity attributes for a user
     * @param user Address of the user
     * @return IdentityAttributes struct with all hashed data
     */
    function getIdentityAttributes(address user) external view returns (IdentityAttributes memory) {
        IdentityAttributes storage attrs = identityAttributes[user];
        require(attrs.userId != address(0), "Identity attributes not found");
        return attrs;
    }
    
    /**
     * @notice Check if a user has registered identity attributes
     * @param user Address to check
     * @return bool True if user has registered identity attributes
     */
    function hasIdentityAttributes(address user) external view returns (bool) {
        return identityAttributes[user].userId != address(0);
    }
}
