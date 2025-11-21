// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IAuditLog
 * @notice Minimal audit logging interface used by ConsentManager and CreditRegistry.
 * @dev Only exposes the stable interaction surface: authorization, logging, and read-only retrieval.
 * @dev Storage structures (arrays, mappings) remain in the implementation, not in the interface.
 */
interface IAuditLog {
    enum EventType {
        CONSENT_GRANTED,
        CONSENT_REVOKED,
        CONSENT_CHECKED,
        IDENTITY_REGISTERED,
        IDENTITY_UPDATED,
        DATA_REQUEST_REJECTED
    }

    struct AuditEntry {
        address accessorUserId;
        address subjectUserId;
        bytes32 hashedScope;
        uint256 unixTimestamp;
        EventType eventType;
    }

    // -------------------------
    // Logging
    // -------------------------

    /**
     * @notice Write a log entry.
     * @dev Only authorized loggers (set by admin) may call this.
     */
    function logEvent(AuditEntry calldata entry) external;

    // -------------------------
    // Authorization
    // -------------------------

    /**
     * @notice Check whether a given address is allowed to write audit entries.
     */
    function isAuthorizedLogger(address logger) external view returns (bool);

    /**
     * @notice Grant logging permission to a given address.
     * @dev Only admin may call this.
     */
    function authorizeLogger(address logger) external;

    /**
     * @notice Revoke logging permission.
     * @dev Only admin may call this.
     */
    function revokeLogger(address logger) external;

    // -------------------------
    // Read-Only Ops
    // -------------------------

    /**
     * @notice Return a specific audit entry.
     */
    function getAuditEntry(uint256 entryId)
        external
        view
        returns (AuditEntry memory);

    /**
     * @notice Return total number of log entries.
     */
    function getLogsCount() external view returns (uint256);

    /**
     * @notice Return all log indices associated with a subject (user).
     */
    function getAccessHistory(address user)
        external
        view
        returns (uint256[] memory);

    /**
     * @notice Return all log indices associated with an accessor.
     */
    function getAccessorHistory(address accessor)
        external
        view
        returns (uint256[] memory);

    /**
     * @notice Return a contiguous range of log entries.
     */
    function getAuditEntries(uint256 startId, uint256 count)
        external
        view
        returns (AuditEntry[] memory);

    /**
     * @notice Return the last N log entries.
     */
    function getRecentLogs(uint256 count)
        external
        view
        returns (AuditEntry[] memory);
}

/**
 * @title AuditLog
 * @notice Concrete implementation of IAuditLog for audit trail storage.
 */
contract AuditLog is IAuditLog {
    address public admin;
    AuditEntry[] private auditEntries;
    
    mapping(address => uint256[]) private subjectAccessHistory;
    mapping(address => uint256[]) private accessorAccessHistory;
    mapping(address => bool) private authorizedLoggers;
    
    event LoggerAuthorized(address indexed logger);
    event LoggerRevoked(address indexed logger);
    event AuditEntryLogged(uint256 indexed entryId, address indexed accessor, address indexed subject);
    
    error Unauthorized();
    error InvalidRange();
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier onlyAuthorizedLogger() {
        if (!authorizedLoggers[msg.sender]) {
            revert Unauthorized();
        }
        _;
    }
    
    constructor() {
        admin = msg.sender;
        authorizedLoggers[msg.sender] = true;
    }
    
    function logEvent(AuditEntry calldata entry) external onlyAuthorizedLogger {
        uint256 entryId = auditEntries.length;
        auditEntries.push(entry);
        
        subjectAccessHistory[entry.subjectUserId].push(entryId);
        accessorAccessHistory[entry.accessorUserId].push(entryId);
        
        emit AuditEntryLogged(entryId, entry.accessorUserId, entry.subjectUserId);
    }
    
    function isAuthorizedLogger(address logger) external view returns (bool) {
        return authorizedLoggers[logger];
    }
    
    function authorizeLogger(address logger) external onlyAdmin {
        require(logger != address(0), "Invalid logger address");
        authorizedLoggers[logger] = true;
        emit LoggerAuthorized(logger);
    }
    
    function revokeLogger(address logger) external onlyAdmin {
        authorizedLoggers[logger] = false;
        emit LoggerRevoked(logger);
    }
    
    function getAuditEntry(uint256 entryId) external view returns (AuditEntry memory) {
        require(entryId < auditEntries.length, "Entry does not exist");
        return auditEntries[entryId];
    }
    
    function getLogsCount() external view returns (uint256) {
        return auditEntries.length;
    }
    
    function getAccessHistory(address user) external view returns (uint256[] memory) {
        return subjectAccessHistory[user];
    }
    
    function getAccessorHistory(address accessor) external view returns (uint256[] memory) {
        return accessorAccessHistory[accessor];
    }
    
    function getAuditEntries(uint256 startId, uint256 count) external view returns (AuditEntry[] memory) {
        if (startId >= auditEntries.length) {
            revert InvalidRange();
        }
        
        uint256 endId = startId + count;
        if (endId > auditEntries.length) {
            endId = auditEntries.length;
        }
        
        uint256 resultCount = endId - startId;
        AuditEntry[] memory result = new AuditEntry[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = auditEntries[startId + i];
        }
        
        return result;
    }
    
    function getRecentLogs(uint256 count) external view returns (AuditEntry[] memory) {
        uint256 totalLogs = auditEntries.length;
        if (totalLogs == 0) {
            return new AuditEntry[](0);
        }
        
        uint256 resultCount = count > totalLogs ? totalLogs : count;
        uint256 startId = totalLogs - resultCount;
        
        AuditEntry[] memory result = new AuditEntry[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = auditEntries[startId + i];
        }
        
        return result;
    }
}
