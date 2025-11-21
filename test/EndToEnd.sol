// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/CreditRegistry.sol";
import "../contracts/ConsentManager.sol";
import "../contracts/AuditLog.sol";

/**
 * @title EndToEndTest
 * @notice Comprehensive end-to-end test validating the complete workflow
 * @dev Tests: deployment, registration, consent, queries, updates, and audit logging
 */
contract EndToEndTest is Test {
    // Contracts
    ConsentManager public consentManager;
    AuditLog public auditLog;
    CreditRegistry public creditRegistry;
    
    // Test accounts
    address public borrower = address(0x1);
    address public lender = address(0x2);
    
    // Test data
    bytes32 public emailHash = keccak256("borrower@example.com");
    string public creditTier = "A";
    string public incomeBracket = "75k-100k";
    string public debtRatioBracket = "20-40%";
    bytes32 public accountReferenceHash = keccak256("offchain-storage-pointer-123");
    bytes32[] public consentScopes;
    
    function setUp() public {
        // Initialize consentScopes array
        consentScopes.push(keccak256("credit_score"));
        
        // 1. Deploy ConsentManager
        consentManager = new ConsentManager();
        
        // 2. Deploy AuditLog
        auditLog = new AuditLog();
        
        // 3. Deploy CreditRegistry with ConsentManager address
        creditRegistry = new CreditRegistry(address(consentManager));
        
        // 4. Set up AuditLog to accept calls from CreditRegistry
        auditLog.authorizeLogger(address(creditRegistry));
        
        // 5. Configure CreditRegistry to use AuditLog
        creditRegistry.setAuditLog(address(auditLog));
    }
    
    // ============================================================
    // TEST: Complete End-to-End Flow
    // ============================================================
    
    function test_EndToEndFlow() public {
        // -------------------------
        // Step 2: Borrower registers on-chain
        // -------------------------
        vm.startPrank(borrower);
        
        // Verify borrower has not registered yet
        assertFalse(creditRegistry.hasIdentityAttributes(borrower), "Should not have attributes initially");
        
        // Register identity attributes
        creditRegistry.registerIdentityAttributes(
            emailHash,
            creditTier,
            incomeBracket,
            debtRatioBracket,
            accountReferenceHash
        );
        
        // Verify registration succeeded
        assertTrue(creditRegistry.hasIdentityAttributes(borrower), "Should have attributes after registration");
        
        // Verify stored data matches input
        ICreditRegistry.IdentityAttributes memory attrs = creditRegistry.getIdentityAttributes(borrower);
        assertEq(attrs.userId, borrower, "User ID mismatch");
        assertEq(attrs.emailHash, emailHash, "Email hash mismatch");
        assertEq(attrs.creditTier, creditTier, "Credit tier mismatch");
        assertEq(attrs.incomeBracket, incomeBracket, "Income bracket mismatch");
        assertEq(attrs.debtRatioBracket, debtRatioBracket, "Debt ratio bracket mismatch");
        assertGt(attrs.lastUpdated, 0, "Last updated should be set");
        
        // Verify account reference hash
        bytes32 storedRefHash = creditRegistry.getAccountReferenceHash(borrower);
        assertEq(storedRefHash, accountReferenceHash, "Account reference hash mismatch");
        
        // Verify audit log entry for registration
        uint256 logCount = auditLog.getLogsCount();
        assertEq(logCount, 1, "Should have 1 audit log entry after registration");
        
        IAuditLog.AuditEntry memory logEntry = auditLog.getAuditEntry(0);
        assertEq(logEntry.accessorUserId, borrower, "Accessor should be borrower");
        assertEq(logEntry.subjectUserId, borrower, "Subject should be borrower");
        assertEq(uint256(logEntry.eventType), uint256(IAuditLog.EventType.IDENTITY_REGISTERED), "Event type should be IDENTITY_REGISTERED");
        
        vm.stopPrank();
        
        // -------------------------
        // Step 3: Lender queries public tiers (off-chain simulation)
        // -------------------------
        // No consent required for public categorical values
        vm.startPrank(lender);
        
        // Query public attributes
        bool hasAttrs = creditRegistry.hasIdentityAttributes(borrower);
        assertTrue(hasAttrs, "Lender should be able to query if borrower has attributes");
        
        ICreditRegistry.IdentityAttributes memory publicAttrs = creditRegistry.getIdentityAttributes(borrower);
        assertEq(publicAttrs.creditTier, creditTier, "Lender should read correct credit tier");
        assertEq(publicAttrs.incomeBracket, incomeBracket, "Lender should read correct income bracket");
        assertEq(publicAttrs.debtRatioBracket, debtRatioBracket, "Lender should read correct debt ratio bracket");
        
        vm.stopPrank();
        
        // -------------------------
        // Step 4: Lender requests sensitive off-chain data (consent required)
        // -------------------------
        vm.startPrank(borrower);
        
        // Borrower grants consent to lender
        uint256 consentDuration = 7 days;
        bytes32 consentId = consentManager.grantConsent(lender, consentScopes, consentDuration);
        assertTrue(consentId != bytes32(0), "Consent ID should be generated");
        
        vm.stopPrank();
        
        // Lender verifies consent before accessing sensitive data
        vm.startPrank(lender);
        
        bool isValid = consentManager.isConsentValid(consentId);
        assertTrue(isValid, "Consent should be valid");
        
        // After consent confirmed, lender can use account reference hash to fetch off-chain data
        bytes32 refHash = creditRegistry.getAccountReferenceHash(borrower);
        assertEq(refHash, accountReferenceHash, "Lender should retrieve account reference hash");
        
        // In a real system, lender would now use refHash to query off-chain encrypted data
        // This demonstrates the consent-gated access pattern
        
        vm.stopPrank();
        
        // -------------------------
        // Step 5: Borrower updates attributes
        // -------------------------
        vm.startPrank(borrower);
        
        bytes32 newEmailHash = keccak256("newemail@example.com");
        string memory newCreditTier = "B";
        string memory newIncomeBracket = "100k-150k";
        // Leave debtRatioBracket unchanged by passing empty string
        
        uint256 timestampBeforeUpdate = block.timestamp;
        
        // Update attributes
        creditRegistry.updateIdentityAttributes(
            newEmailHash,
            newCreditTier,
            newIncomeBracket,
            "" // empty string = don't update
        );
        
        // Verify updated fields
        ICreditRegistry.IdentityAttributes memory updatedAttrs = creditRegistry.getIdentityAttributes(borrower);
        assertEq(updatedAttrs.emailHash, newEmailHash, "Email hash should be updated");
        assertEq(updatedAttrs.creditTier, newCreditTier, "Credit tier should be updated");
        assertEq(updatedAttrs.incomeBracket, newIncomeBracket, "Income bracket should be updated");
        assertEq(updatedAttrs.debtRatioBracket, debtRatioBracket, "Debt ratio bracket should remain unchanged");
        assertGe(updatedAttrs.lastUpdated, timestampBeforeUpdate, "Last updated should advance");
        
        // Verify audit log entry for update
        uint256 finalLogCount = auditLog.getLogsCount();
        assertEq(finalLogCount, 2, "Should have 2 audit log entries after update");
        
        IAuditLog.AuditEntry memory updateLogEntry = auditLog.getAuditEntry(1);
        assertEq(updateLogEntry.accessorUserId, borrower, "Accessor should be borrower");
        assertEq(updateLogEntry.subjectUserId, borrower, "Subject should be borrower");
        assertEq(uint256(updateLogEntry.eventType), uint256(IAuditLog.EventType.IDENTITY_UPDATED), "Event type should be IDENTITY_UPDATED");
        
        vm.stopPrank();
        
        // -------------------------
        // Step 6: Verify complete audit trail
        // -------------------------
        uint256[] memory borrowerHistory = auditLog.getAccessHistory(borrower);
        assertEq(borrowerHistory.length, 2, "Borrower should have 2 audit entries as subject");
        
        // Verify we can retrieve all logs
        IAuditLog.AuditEntry[] memory allLogs = auditLog.getRecentLogs(2);
        assertEq(allLogs.length, 2, "Should retrieve 2 recent logs");
        assertEq(uint256(allLogs[0].eventType), uint256(IAuditLog.EventType.IDENTITY_REGISTERED), "First log should be registration");
        assertEq(uint256(allLogs[1].eventType), uint256(IAuditLog.EventType.IDENTITY_UPDATED), "Second log should be update");
    }
    
    // ============================================================
    // ADDITIONAL TESTS: Edge Cases and Validations
    // ============================================================
    
    function test_CannotRegisterTwice() public {
        vm.startPrank(borrower);
        
        // First registration succeeds
        creditRegistry.registerIdentityAttributes(
            emailHash,
            creditTier,
            incomeBracket,
            debtRatioBracket,
            accountReferenceHash
        );
        
        // Second registration should fail
        vm.expectRevert("Identity attributes already registered");
        creditRegistry.registerIdentityAttributes(
            emailHash,
            creditTier,
            incomeBracket,
            debtRatioBracket,
            accountReferenceHash
        );
        
        vm.stopPrank();
    }
    
    function test_CannotUpdateBeforeRegistration() public {
        vm.startPrank(borrower);
        
        // Attempt to update without registering first
        vm.expectRevert(ICreditRegistry.IdentityAttributesNotFound.selector);
        creditRegistry.updateIdentityAttributes(
            emailHash,
            creditTier,
            incomeBracket,
            debtRatioBracket
        );
        
        vm.stopPrank();
    }
    
    function test_ConsentExpirationFlow() public {
        // Borrower registers
        vm.startPrank(borrower);
        creditRegistry.registerIdentityAttributes(
            emailHash,
            creditTier,
            incomeBracket,
            debtRatioBracket,
            accountReferenceHash
        );
        
        // Grant short-duration consent
        uint256 shortDuration = 1 hours;
        bytes32 consentId = consentManager.grantConsent(lender, consentScopes, shortDuration);
        vm.stopPrank();
        
        // Consent valid initially
        assertTrue(consentManager.isConsentValid(consentId), "Consent should be valid initially");
        
        // Fast forward past expiration
        vm.warp(block.timestamp + 2 hours);
        
        // Consent should now be invalid
        assertFalse(consentManager.isConsentValid(consentId), "Consent should be expired");
    }
    
    function test_PartialUpdatePreservesOtherFields() public {
        vm.startPrank(borrower);
        
        // Register with initial values
        creditRegistry.registerIdentityAttributes(
            emailHash,
            creditTier,
            incomeBracket,
            debtRatioBracket,
            accountReferenceHash
        );
        
        // Update only credit tier
        string memory newTier = "C";
        creditRegistry.updateIdentityAttributes(
            bytes32(0), // Don't update email
            newTier,    // Update tier
            "",         // Don't update income
            ""          // Don't update debt ratio
        );
        
        // Verify only credit tier changed
        ICreditRegistry.IdentityAttributes memory attrs = creditRegistry.getIdentityAttributes(borrower);
        assertEq(attrs.emailHash, emailHash, "Email hash should be unchanged");
        assertEq(attrs.creditTier, newTier, "Credit tier should be updated");
        assertEq(attrs.incomeBracket, incomeBracket, "Income bracket should be unchanged");
        assertEq(attrs.debtRatioBracket, debtRatioBracket, "Debt ratio bracket should be unchanged");
        
        vm.stopPrank();
    }
    
    function test_AuditLogAuthorizationRequired() public {
        // Create unauthorized logger (not the CreditRegistry)
        address unauthorizedLogger = address(0x999);
        
        vm.startPrank(unauthorizedLogger);
        
        IAuditLog.AuditEntry memory entry = IAuditLog.AuditEntry({
            accessorUserId: unauthorizedLogger,
            subjectUserId: borrower,
            hashedScope: bytes32(0),
            unixTimestamp: block.timestamp,
            eventType: IAuditLog.EventType.IDENTITY_REGISTERED
        });
        
        // Should revert because unauthorizedLogger is not authorized
        vm.expectRevert(AuditLog.Unauthorized.selector);
        auditLog.logEvent(entry);
        
        vm.stopPrank();
    }
}
