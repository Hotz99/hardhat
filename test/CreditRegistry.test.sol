// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/CreditRegistry.sol";
import "../contracts/ConsentManager.sol";

/**
 * @title CreditRegistryTest
 * @notice Black-box test suite for CreditRegistry contract
 * @dev Tests core workflows: consent grant, data fetch with consent check, and revocation
 */
contract CreditRegistryTest is Test {
    CreditRegistry public creditRegistry;
    ConsentManager public consentManager;

    address public borrower;
    address public lender;
    address public otherLender;

    function setUp() public {
        // Deploy contracts
        consentManager = new ConsentManager();
        creditRegistry = new CreditRegistry(address(consentManager));

        // Set up test accounts
        borrower = makeAddr("borrower");
        lender = makeAddr("lender");
        otherLender = makeAddr("otherLender");

        // Fund accounts
        vm.deal(borrower, 1 ether);
        vm.deal(lender, 1 ether);
        vm.deal(otherLender, 1 ether);
    }

    // =========================================================================
    // Deployment Tests
    // =========================================================================

    function test_DeploymentWithValidConsentManager() public view {
        assertEq(address(creditRegistry.consentManager()), address(consentManager));
    }

    function test_RevertDeploymentWithZeroAddress() public {
        vm.expectRevert("Invalid ConsentManager address");
        new CreditRegistry(address(0));
    }

    // =========================================================================
    // Identity Registration Tests
    // =========================================================================

    function test_RegisterIdentityAttributesSuccessfully() public {
        bytes32 emailHash = keccak256(abi.encodePacked("borrower@example.com"));
        string memory creditTier = "A";
        string memory incomeBracket = "75k-100k";
        string memory debtRatioBracket = "0-20%";
        bytes32 accountReferenceHash = keccak256(abi.encodePacked("account-ref-12345"));

        vm.prank(borrower);
        creditRegistry.registerIdentityAttributes(
            emailHash,
            creditTier,
            incomeBracket,
            debtRatioBracket,
            accountReferenceHash
        );

        // Verify registration
        ICreditRegistry.IdentityAttributes memory attrs = creditRegistry.getIdentityAttributes(borrower);
        assertEq(attrs.userId, borrower);
        assertEq(attrs.emailHash, emailHash);
        assertEq(attrs.creditTier, creditTier);
        assertEq(attrs.incomeBracket, incomeBracket);
        assertEq(attrs.debtRatioBracket, debtRatioBracket);

        // Verify account reference hash
        bytes32 storedRefHash = creditRegistry.getAccountReferenceHash(borrower);
        assertEq(storedRefHash, accountReferenceHash);
    }

    function test_EmitIdentityAttributesRegisteredEvent() public {
        bytes32 emailHash = keccak256(abi.encodePacked("borrower@example.com"));
        bytes32 accountReferenceHash = keccak256(abi.encodePacked("account-ref"));

        vm.expectEmit(true, false, false, false);
        emit ICreditRegistry.IdentityAttributesRegistered(borrower, block.timestamp);

        vm.prank(borrower);
        creditRegistry.registerIdentityAttributes(
            emailHash,
            "B",
            "50k-75k",
            "20-40%",
            accountReferenceHash
        );
    }

    function test_RevertRegistrationWithInvalidEmailHash() public {
        vm.prank(borrower);
        vm.expectRevert("Invalid email hash");
        creditRegistry.registerIdentityAttributes(
            bytes32(0),
            "A",
            "75k-100k",
            "0-20%",
            keccak256(abi.encodePacked("account-ref"))
        );
    }

    function test_RevertRegistrationWithEmptyCreditTier() public {
        vm.prank(borrower);
        vm.expectRevert("Invalid credit tier");
        creditRegistry.registerIdentityAttributes(
            keccak256(abi.encodePacked("email@example.com")),
            "",
            "75k-100k",
            "0-20%",
            keccak256(abi.encodePacked("account-ref"))
        );
    }

    function test_RevertRegistrationWithInvalidAccountReferenceHash() public {
        vm.prank(borrower);
        vm.expectRevert("Account reference hash required");
        creditRegistry.registerIdentityAttributes(
            keccak256(abi.encodePacked("email@example.com")),
            "A",
            "75k-100k",
            "0-20%",
            bytes32(0)
        );
    }

    function test_RevertDuplicateRegistration() public {
        bytes32 emailHash = keccak256(abi.encodePacked("borrower@example.com"));
        bytes32 accountReferenceHash = keccak256(abi.encodePacked("account-ref"));

        vm.startPrank(borrower);
        creditRegistry.registerIdentityAttributes(
            emailHash,
            "A",
            "75k-100k",
            "0-20%",
            accountReferenceHash
        );

        vm.expectRevert("Identity attributes already registered");
        creditRegistry.registerIdentityAttributes(
            emailHash,
            "B",
            "50k-75k",
            "20-40%",
            accountReferenceHash
        );
        vm.stopPrank();
    }

    // =========================================================================
    // Identity Update Tests
    // =========================================================================

    function test_UpdateCreditTierSuccessfully() public {
        // Register first
        vm.prank(borrower);
        creditRegistry.registerIdentityAttributes(
            keccak256(abi.encodePacked("borrower@example.com")),
            "A",
            "75k-100k",
            "0-20%",
            keccak256(abi.encodePacked("account-ref"))
        );

        // Update credit tier
        vm.prank(borrower);
        creditRegistry.updateIdentityAttributes(bytes32(0), "B", "", "");

        ICreditRegistry.IdentityAttributes memory attrs = creditRegistry.getIdentityAttributes(borrower);
        assertEq(attrs.creditTier, "B");
        assertEq(attrs.incomeBracket, "75k-100k"); // unchanged
    }

    function test_UpdateMultipleFields() public {
        vm.prank(borrower);
        creditRegistry.registerIdentityAttributes(
            keccak256(abi.encodePacked("old@example.com")),
            "A",
            "75k-100k",
            "0-20%",
            keccak256(abi.encodePacked("account-ref"))
        );

        bytes32 newEmailHash = keccak256(abi.encodePacked("new@example.com"));
        vm.prank(borrower);
        creditRegistry.updateIdentityAttributes(newEmailHash, "C", "100k-150k", "40-60%");

        ICreditRegistry.IdentityAttributes memory attrs = creditRegistry.getIdentityAttributes(borrower);
        assertEq(attrs.emailHash, newEmailHash);
        assertEq(attrs.creditTier, "C");
        assertEq(attrs.incomeBracket, "100k-150k");
        assertEq(attrs.debtRatioBracket, "40-60%");
    }

    function test_RevertUpdateForNonExistentIdentity() public {
        vm.prank(borrower);
        vm.expectRevert(ICreditRegistry.IdentityAttributesNotFound.selector);
        creditRegistry.updateIdentityAttributes(
            keccak256(abi.encodePacked("email@example.com")),
            "A",
            "75k-100k",
            "0-20%"
        );
    }

    // =========================================================================
    // Public Getters Tests
    // =========================================================================

    function test_GetIdentityAttributesForRegisteredUser() public {
        vm.prank(borrower);
        creditRegistry.registerIdentityAttributes(
            keccak256(abi.encodePacked("borrower@example.com")),
            "A",
            "75k-100k",
            "0-20%",
            keccak256(abi.encodePacked("account-ref"))
        );

        ICreditRegistry.IdentityAttributes memory attrs = creditRegistry.getIdentityAttributes(borrower);
        assertEq(attrs.creditTier, "A");
        assertEq(attrs.incomeBracket, "75k-100k");
        assertEq(attrs.debtRatioBracket, "0-20%");
    }

    function test_HasIdentityAttributesWhenRegistered() public {
        vm.prank(borrower);
        creditRegistry.registerIdentityAttributes(
            keccak256(abi.encodePacked("borrower@example.com")),
            "A",
            "75k-100k",
            "0-20%",
            keccak256(abi.encodePacked("account-ref"))
        );

        assertTrue(creditRegistry.hasIdentityAttributes(borrower));
    }

    function test_HasIdentityAttributesWhenNotRegistered() public view {
        assertFalse(creditRegistry.hasIdentityAttributes(otherLender));
    }

    function test_RevertGetIdentityAttributesForNonExistentUser() public {
        vm.expectRevert("Identity attributes not found");
        creditRegistry.getIdentityAttributes(otherLender);
    }

    // =========================================================================
    // Workflow: Consent Grant
    // =========================================================================

    function test_Workflow_ConsentGrant() public {
        // Step 1: Borrower registers identity
        vm.prank(borrower);
        creditRegistry.registerIdentityAttributes(
            keccak256(abi.encodePacked("borrower@example.com")),
            "A",
            "75k-100k",
            "0-20%",
            keccak256(abi.encodePacked("account-ref-12345"))
        );

        // Step 2: Borrower grants consent to lender
        bytes32 scope = keccak256(abi.encodePacked("credit_score"));
        bytes32[] memory scopes = new bytes32[](1);
        scopes[0] = scope;
        uint256 durationSeconds = 1 days;

        vm.prank(borrower);
        bytes32 consentId = consentManager.grantConsent(lender, scopes, durationSeconds);

        // Step 3: ConsentManager creates consent struct and stores it
        (
            address storedBorrower,
            address storedLender,
            uint256 startBlockTime,
            uint256 expiryBlockTime,
            bool isRevoked
        ) = consentManager.consents(consentId);

        assertEq(storedBorrower, borrower);
        assertEq(storedLender, lender);
        assertEq(startBlockTime, block.timestamp);
        assertEq(expiryBlockTime, block.timestamp + durationSeconds);
        assertFalse(isRevoked);

        // Verify scopes are stored
        bytes32[] memory storedScopes = consentManager.getScopes(consentId);
        assertEq(storedScopes.length, 1);
        assertEq(storedScopes[0], scope);
    }

    // =========================================================================
    // Workflow: Data Fetch with Consent Check
    // =========================================================================

    function test_Workflow_DataFetchWithConsentCheck() public {
        // Step 1: Borrower registers identity
        vm.prank(borrower);
        creditRegistry.registerIdentityAttributes(
            keccak256(abi.encodePacked("borrower@example.com")),
            "A",
            "75k-100k",
            "0-20%",
            keccak256(abi.encodePacked("account-ref-12345"))
        );

        // Step 2: Borrower grants consent
        bytes32 scope = keccak256(abi.encodePacked("credit_score"));
        bytes32[] memory scopes = new bytes32[](1);
        scopes[0] = scope;

        vm.prank(borrower);
        consentManager.grantConsent(lender, scopes, 1 days);

        // Step 3: Lender (OffChainStore) queries ConsentManager with checkConsent
        vm.prank(lender);
        bool isValid = consentManager.checkConsent(borrower, scope);

        // Step 4: ConsentManager returns valid
        assertTrue(isValid);

        // Step 5: Lender can access public categorical attributes
        ICreditRegistry.IdentityAttributes memory attrs = creditRegistry.getIdentityAttributes(borrower);
        assertEq(attrs.creditTier, "A");

        // Step 6: Lender gets account reference hash (off-chain must verify consent)
        bytes32 refHash = creditRegistry.getAccountReferenceHash(borrower);
        assertNotEq(refHash, bytes32(0));
    }

    function test_Workflow_DataFetchWithoutConsent() public {
        // Lender queries without consent granted
        bytes32 scope = keccak256(abi.encodePacked("credit_score"));

        vm.prank(lender);
        bool isValid = consentManager.checkConsent(borrower, scope);

        // Should return invalid
        assertFalse(isValid);
    }

    function test_Workflow_EnforceScopeRestrictions() public {
        bytes32 grantedScope = keccak256(abi.encodePacked("credit_score"));
        bytes32 notGrantedScope = keccak256(abi.encodePacked("income_details"));
        bytes32[] memory scopes = new bytes32[](1);
        scopes[0] = grantedScope;

        vm.prank(borrower);
        consentManager.grantConsent(lender, scopes, 1 days);

        // Granted scope should be valid
        vm.prank(lender);
        assertTrue(consentManager.checkConsent(borrower, grantedScope));

        // Not granted scope should be invalid
        vm.prank(lender);
        assertFalse(consentManager.checkConsent(borrower, notGrantedScope));
    }

    // =========================================================================
    // Workflow: Revocation
    // =========================================================================

    function test_Workflow_Revocation() public {
        bytes32 scope = keccak256(abi.encodePacked("credit_score"));
        bytes32[] memory scopes = new bytes32[](1);
        scopes[0] = scope;

        // Step 1: Grant consent
        vm.prank(borrower);
        consentManager.grantConsent(lender, scopes, 1 days);

        // Step 2: Verify consent is valid
        vm.prank(lender);
        assertTrue(consentManager.checkConsent(borrower, scope));

        // Step 3: Borrower revokes consent
        vm.prank(borrower);
        consentManager.revokeAllConsents(lender);

        // Step 4: Subsequent checks should resolve to invalid
        vm.prank(lender);
        assertFalse(consentManager.checkConsent(borrower, scope));
    }

    function test_Workflow_MultipleConsentsToMultipleLenders() public {
        vm.prank(borrower);
        creditRegistry.registerIdentityAttributes(
            keccak256(abi.encodePacked("borrower@example.com")),
            "A",
            "75k-100k",
            "0-20%",
            keccak256(abi.encodePacked("account-ref"))
        );

        bytes32 scope1 = keccak256(abi.encodePacked("credit_score"));
        bytes32 scope2 = keccak256(abi.encodePacked("income_details"));

        bytes32[] memory scopes1 = new bytes32[](1);
        scopes1[0] = scope1;
        bytes32[] memory scopes2 = new bytes32[](1);
        scopes2[0] = scope2;

        // Grant to lender
        vm.prank(borrower);
        consentManager.grantConsent(lender, scopes1, 1 days);

        // Grant to otherLender
        vm.prank(borrower);
        consentManager.grantConsent(otherLender, scopes2, 1 days);

        // Verify lender can access scope1
        vm.prank(lender);
        assertTrue(consentManager.checkConsent(borrower, scope1));

        // Verify otherLender can access scope2
        vm.prank(otherLender);
        assertTrue(consentManager.checkConsent(borrower, scope2));

        // Verify lender cannot access scope2
        vm.prank(lender);
        assertFalse(consentManager.checkConsent(borrower, scope2));
    }

    // =========================================================================
    // Edge Cases
    // =========================================================================

    function test_ReadPublicAttributesWithoutConsent() public {
        vm.prank(borrower);
        creditRegistry.registerIdentityAttributes(
            keccak256(abi.encodePacked("borrower@example.com")),
            "A",
            "75k-100k",
            "0-20%",
            keccak256(abi.encodePacked("account-ref"))
        );

        // Any account can read public attributes (no consent required)
        ICreditRegistry.IdentityAttributes memory attrs = creditRegistry.getIdentityAttributes(borrower);
        assertEq(attrs.creditTier, "A");
    }

    function test_MaintainDataIntegrityAfterMultipleUpdates() public {
        vm.prank(borrower);
        creditRegistry.registerIdentityAttributes(
            keccak256(abi.encodePacked("email1@example.com")),
            "A",
            "75k-100k",
            "0-20%",
            keccak256(abi.encodePacked("ref1"))
        );

        // Multiple updates
        vm.startPrank(borrower);
        creditRegistry.updateIdentityAttributes(bytes32(0), "B", "", "");
        creditRegistry.updateIdentityAttributes(bytes32(0), "", "100k-150k", "");
        vm.stopPrank();

        ICreditRegistry.IdentityAttributes memory attrs = creditRegistry.getIdentityAttributes(borrower);
        assertEq(attrs.creditTier, "B");
        assertEq(attrs.incomeBracket, "100k-150k");
        assertEq(attrs.debtRatioBracket, "0-20%"); // unchanged
    }

    function test_ConsentExpiryEnforcement() public {
        bytes32 scope = keccak256(abi.encodePacked("credit_score"));
        bytes32[] memory scopes = new bytes32[](1);
        scopes[0] = scope;
        uint256 durationSeconds = 100;

        vm.prank(borrower);
        consentManager.grantConsent(lender, scopes, durationSeconds);

        // Initially valid
        vm.prank(lender);
        assertTrue(consentManager.checkConsent(borrower, scope));

        // Fast forward past expiry
        vm.warp(block.timestamp + durationSeconds + 1);

        // Should now be invalid
        vm.prank(lender);
        assertFalse(consentManager.checkConsent(borrower, scope));
    }
}
