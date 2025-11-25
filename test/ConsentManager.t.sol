// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ConsentManager} from "../contracts/ConsentManager.sol";
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

contract ConsentManagerTest is Test {
    ConsentManager public consentManager;
    
    address public borrower;
    address public lender;
    address public otherAddress;
    
    bytes32 public scopeCreditScore;
    bytes32 public scopeIncome;
    bytes32 public scopeEmployment;
    
    uint256 public constant ONE_DAY = 86400;
    uint256 public constant ONE_WEEK = 604800;
    
    function setUp() public {
        borrower = address(0x1);
        lender = address(0x2);
        otherAddress = address(0x3);
        
        scopeCreditScore = keccak256(abi.encodePacked("credit_score"));
        scopeIncome = keccak256(abi.encodePacked("income"));
        scopeEmployment = keccak256(abi.encodePacked("employment"));
        
        // locally "deploy" contract
        consentManager = new ConsentManager();
    }

    // ============================================
    // SANITY CHECK: CONSENT LIST
    // ============================================

    // function test_SanityCheckConsentList() public {
    //     // 1. Borrower signs transaction calling grantConsent
    //     vm.startPrank(borrower);
    //     bytes32[] memory hashedScopes = new bytes32[](2);
    //     hashedScopes[0] = scopeCreditScore;
    //     hashedScopes[1] = scopeIncome;
        
    //     uint256 consentId = consentManager.grantConsent(lender, hashedScopes, ONE_DAY);
    //     uint256 consent1Id = consentManager.grantConsent(lender, hashedScopes, 1 weeks);
        
    //     vm.stopPrank();
        
    //     require(consentId == uint256(0), "ConsentId should be generated");
    //     require(consent1Id == uint256(1), "ConsentId should be generated");
    //     require(consentManager.getConsentCount() == uint(2), "Grants not being created correctly");
    // }

    
    // ============================================
    // WORKFLOW: CONSENT GRANT
    // ============================================
    
    function test_WorkflowConsentGrant() public {
        // 1. Borrower signs transaction calling grantConsent
        vm.startPrank(borrower);
        bytes32[] memory hashedScopes = new bytes32[](2);
        hashedScopes[0] = scopeCreditScore;
        hashedScopes[1] = scopeIncome;
        
        uint256 consentId = consentManager.grantConsent(lender, hashedScopes, ONE_DAY);
        
        vm.stopPrank();
        
        // 2. Verify ConsentManager created consent struct with correct fields
        (
            address storedBorrower,
            address storedLender,
            uint256 startTime,
            uint256 expiryTime,
            bool isRevoked
        ) = consentManager.consents(consentId);
        
        require(storedBorrower == borrower, "Borrower should match");
        require(storedLender == lender, "Lender should match");
        
        bytes32[] memory scopes = consentManager.getScopes(consentId);
        
        require(startTime > 0, "Start time should be set");
        require(expiryTime == startTime + ONE_DAY, "Expiry should be start + duration");
        require(!isRevoked, "Should not be revoked initially");
        
        // 3. Verify consent stored under consentId (hash of fields)
        require(consentId == uint256(0), "ConsentId should be index 0 of array");
        require(consentManager.isConsentValid(consentId), "Consent should be valid");
    }
    
    // ============================================
    // WORKFLOW: DATA FETCH WITH CONSENT CHECK
    // ============================================
    
    function test_WorkflowDataFetchWithConsentCheck() public {
        // Setup: Borrower grants consent
        vm.startPrank(borrower);
        bytes32[] memory hashedScopes = new bytes32[](1);
        hashedScopes[0] = scopeCreditScore;
        consentManager.grantConsent(lender, hashedScopes, ONE_DAY);
        vm.stopPrank();
        
        // 1. Lender sends data access request (simulated by calling checkConsent)
        // 2. OffChainStore queries ConsentManager with checkConsent(borrower, scope)
        vm.startPrank(lender);
        bool isValid = consentManager.checkConsent(borrower, scopeCreditScore);
        vm.stopPrank();
        
        // 3. ConsentManager returns valid
        require(isValid, "Should return valid for granted scope");
        
        // 4. Verify OffChainStore would serve data (valid = true)
        // Test invalid scope - OffChainStore should NOT serve data
        vm.startPrank(lender);
        bool invalidScope = consentManager.checkConsent(borrower, scopeIncome);
        vm.stopPrank();
        require(!invalidScope, "Should return invalid for non-granted scope");
        
        // Test wrong lender - OffChainStore should NOT serve data
        vm.startPrank(otherAddress);
        bool wrongLender = consentManager.checkConsent(borrower, scopeCreditScore);
        vm.stopPrank();
        require(!wrongLender, "Should return invalid for wrong lender");
    }
    
    // ============================================
    // WORKFLOW: REVOCATION
    // ============================================
    
    function test_WorkflowRevocation() public {
        // Setup: Grant consent first
        vm.startPrank(borrower);
        bytes32[] memory hashedScopes = new bytes32[](1);
        hashedScopes[0] = scopeCreditScore;
        uint256 consentId = consentManager.grantConsent(lender, hashedScopes, ONE_DAY);
        
        // Verify consent is initially valid
        require(consentManager.isConsentValid(consentId), "Consent should be valid initially");
        
        // 1. Borrower signs transaction calling `revokeAllConsents(lender)`
        consentManager.revokeAllConsents(lender);
        vm.stopPrank();
        
        // 2. Verify ConsentManager set revoked field to true
        (, , , , bool revoked) = consentManager.consents(consentId);
        require(revoked, "Consent revoked field should be true");
        
        // 3. Subsequent checks resolve to invalid
        require(!consentManager.isConsentValid(consentId), "isConsentValid should return false");
        
        vm.startPrank(lender);
        bool checkResult = consentManager.checkConsent(borrower, scopeCreditScore);
        vm.stopPrank();
        require(!checkResult, "checkConsent should return false after revocation");
    }
    
    // ============================================
    // INTEGRATION TESTS
    // ============================================
    
    function test_FullWorkflowSingleLender() public {
        // 1. Grant consent
        vm.startPrank(borrower);
        bytes32[] memory hashedScopes = new bytes32[](2);
        hashedScopes[0] = scopeCreditScore;
        hashedScopes[1] = scopeIncome;
        uint256 consentId = consentManager.grantConsent(lender, hashedScopes, ONE_DAY);
        vm.stopPrank();
        
        // 2. Verify consent is valid
        require(consentManager.isConsentValid(consentId), "Consent should be valid");
        
        // 3. Lender checks authorization
        vm.startPrank(lender);
        bool isAuthorized = consentManager.checkConsent(borrower, scopeCreditScore);
        vm.stopPrank();
        require(isAuthorized, "Lender should be authorized");
        
        // 4. Borrower revokes consent
        vm.startPrank(borrower);
        consentManager.revokeAllConsents(lender);
        vm.stopPrank();
        
        // 5. Verify consent is now invalid
        require(!consentManager.isConsentValid(consentId), "Consent should be invalid after revocation");
        
        // 6. Lender check fails
        vm.startPrank(lender);
        bool stillAuthorized = consentManager.checkConsent(borrower, scopeCreditScore);
        vm.stopPrank();
        require(!stillAuthorized, "Lender should not be authorized after revocation");
    }
    
    function test_MultipleLendersIndependentConsents() public {
        address lender2 = address(0x4);
        
        vm.startPrank(borrower);
        
        // Grant consent to lender1
        bytes32[] memory hashedScopes1 = new bytes32[](1);
        hashedScopes1[0] = scopeCreditScore;
        consentManager.grantConsent(lender, hashedScopes1, ONE_DAY);
        
        // Grant consent to lender2
        bytes32[] memory hashedScopes2 = new bytes32[](1);
        hashedScopes2[0] = scopeIncome;
        consentManager.grantConsent(lender2, hashedScopes2, ONE_DAY);
        
        // Revoke consent for lender1 only
        consentManager.revokeAllConsents(lender);
        
        vm.stopPrank();
        
        // Check lender1 is revoked
        vm.startPrank(lender);
        bool lender1Valid = consentManager.checkConsent(borrower, scopeCreditScore);
        vm.stopPrank();
        require(!lender1Valid, "Lender1 consent should be revoked");
        
        // Check lender2 still valid
        vm.startPrank(lender2);
        bool lender2Valid = consentManager.checkConsent(borrower, scopeIncome);
        vm.stopPrank();
        require(lender2Valid, "Lender2 consent should still be valid");
    }
    
    function test_ConsentExpiration() public {
        vm.startPrank(borrower);
        bytes32[] memory hashedScopes = new bytes32[](1);
        hashedScopes[0] = scopeCreditScore;
        uint256 consentId = consentManager.grantConsent(lender, hashedScopes, ONE_DAY);
        vm.stopPrank();
        
        // Consent should be valid initially
        require(consentManager.isConsentValid(consentId), "Consent should be valid initially");
        
        // Fast forward past expiry
        vm.warp(block.timestamp + ONE_DAY + 1);
        
        // Consent should now be expired
        require(!consentManager.isConsentValid(consentId), "Consent should be expired");
        
        // Check should also fail after expiration
        vm.startPrank(lender);
        bool isValid = consentManager.checkConsent(borrower, scopeCreditScore);
        vm.stopPrank();
        require(!isValid, "Check should fail for expired consent");
    }
    
    function test_MultipleConsentsToSameLender() public {
        vm.startPrank(borrower);
        
        bytes32[] memory scopes1 = new bytes32[](1);
        scopes1[0] = scopeCreditScore;
        uint256 consentId1 = consentManager.grantConsent(lender, scopes1, ONE_DAY);
        
        bytes32[] memory scopes2 = new bytes32[](1);
        scopes2[0] = scopeIncome;
        uint256 consentId2 = consentManager.grantConsent(lender, scopes2, ONE_WEEK);
        
        bytes32[] memory scopes3 = new bytes32[](1);
        scopes3[0] = scopeEmployment;
        uint256 consentId3 = consentManager.grantConsent(lender, scopes3, ONE_DAY);
        
        vm.stopPrank();
        
        // Verify unique consentIds
        require(consentId1 != consentId2, "Consent IDs should be unique");
        require(consentId2 != consentId3, "Consent IDs should be unique");
        require(consentId1 != consentId3, "Consent IDs should be unique");
        
        (uint256[] memory consentIds) = consentManager.getBorrowerConsents(borrower);
        require(consentIds.length == 3, "Should have 3 consents");
        
        // Revoke all consents to this lender
        vm.startPrank(borrower);
        consentManager.revokeAllConsents(lender);
        vm.stopPrank();
        
        // Verify all are now invalid
        vm.startPrank(lender);
        require(!consentManager.checkConsent(borrower, scopeCreditScore), "Should be revoked");
        require(!consentManager.checkConsent(borrower, scopeIncome), "Should be revoked");
        require(!consentManager.checkConsent(borrower, scopeEmployment), "Should be revoked");
        vm.stopPrank();
    }

    // ============================================
    // PROFILING: LARGE SCALE GRANT CREATION
    // ============================================ 
    function test_LargeScaleGrantCreation() public {
        for (uint256 foo=0; foo < 3; foo++) {
            for (uint256 i = 1; i < 51; i++) {
                for (uint256 j = 1; j < 51; j++) {
                    if (i == j) {
                        continue;
                    }

                    address _borrower = address(uint160(uint(keccak256(abi.encodePacked(i)))));
                    address _lender = address(uint160(uint(keccak256(abi.encodePacked(j)))));

                    vm.startPrank(_borrower);

                    // address _lender = address(j);
                
                    bytes32[] memory scopes1 = new bytes32[](1);
                    scopes1[0] = scopeCreditScore;
                    uint256 consentId1 = consentManager.grantConsent(_lender, scopes1, ONE_DAY);
                    
                    bytes32[] memory scopes2 = new bytes32[](1);
                    scopes2[0] = scopeIncome;
                    uint256 consentId2 = consentManager.grantConsent(_lender, scopes2, ONE_WEEK);
                    
                    bytes32[] memory scopes3 = new bytes32[](1);
                    scopes3[0] = scopeEmployment;
                    uint256 consentId3 = consentManager.grantConsent(_lender, scopes3, ONE_DAY);
                    
                    vm.stopPrank();
                }
            }
        }

       for (int i = 1; i < 51; i++) {
            address _borrower = address(uint160(uint(keccak256(abi.encodePacked(i)))));
            (uint256[] memory consentIds) = consentManager.getBorrowerConsents(_borrower);            
            require(consentIds.length > 0);
        } 

        require(consentManager.getConsentCount() > 9000, "Not enough grants created!");
    }


}
