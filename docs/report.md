# Decentralized Credit Verification System Report

## Problem Statement

Centralized credit reporting systems create significant privacy risks and lack user control. Users are often unaware of who accesses their financial data, and massive data breaches frequently compromise sensitive personal information. Furthermore, users cannot easily revoke access once granted, and there is no immutable, transparent record of data access. This project aims to build a blockchain-based decentralized identity and data sharing platform for the financial domain, specifically for creditworthiness verification, where users retain ownership of their data and control access through revocable, auditable consents.

## Users and Roles

The system defines the following roles:

- **User (Borrower/Identity Owner):** The individual who owns the data and the digital identity. They initiate registration, upload off-chain data, and manage consent settings (granting and revoking access).
- **Requester (Lender):** The entity (e.g., a bank or financial service) that requests access to the user's credit data to verify creditworthiness. They must obtain valid consent before accessing any off-chain information.
- **Administrator:** Responsible for the initial deployment and configuration of the smart contracts.

## Functional Requirements

To address the problem statement, the system implements the following core functions:

1. **User Registration:** Users can register a digital identity using hashed attributes (e.g., email hash) to ensure privacy while maintaining uniqueness.
2. **Consent Management:** Users can grant granular, time-limited consent to specific Requesters for specific **identity attributes** (scopes).
3. **Consent Revocation:** Users have the ability to revoke previously granted consents at any time, immediately invalidating further access.
4. **Audit Logging:** Every access attempt to the off-chain data is logged on-chain. This includes both successful accesses (authorized) and failed attempts (unauthorized), creating an immutable audit trail.

## System Overview

We implemented a hybrid model separating verification from data storage. Users are registered on-chain with hashed attributes while keeping sensitive financial data off-chain. When a Lender needs verification, the User grants on-chain consent. The Lender then requests data from the off-chain store, which verifies the consent against the blockchain before serving data. All access events are immutably logged.

## Proposed Solution

Our decentralized credit system separates _verifiability_ from _disclosure_. Broadcasting exact credit scores on-chain—even under pseudonyms—compromises financial privacy, enabling global correlation, de-anonymization, and profiling by adversaries with access to auxiliary datasets.

The proposed solution is not an "anonymous credit score system" in the conventional sense—it is a **selectively disclosable, consent-driven credit verification protocol**. Users maintain control over when and to whom their exact score (or a bracketed proof of score) is revealed.

The chain anchors:

- existence of a valid score
- consent to disclose it
- proof that a particular requester accessed it

The score itself remains off-chain, or is revealed only to a requesting lender through zero-knowledge proofs or verifiable access events.

## Identity Attributes

For this project, attributes must satisfy two constraints:

- minimal disclosure
- compatibility with hashed on-chain representation

Necessary attributes follow directly from the functional requirements:

- uniquely identify a user
- enable lenders to verify credit tier without exposing raw financial data
- immutable access control to off-chain data:

### Concerns

#### Re‑identifiability

A user becomes re‑identifiable when a data point—alone or combined with other attributes—lets an observer infer who the user is, even if the data is hashed or partially anonymized. High‑precision numerical credit scores act as quasi‑identifiers because they are statistically sparse. A specific score (e.g. 742) appears in far fewer real‑world profiles than a broad tier like “Good” or "A", making it easier to match to external datasets or leaked credit bureau records.

#### Data Exposure Risk

A system leaks information when an observer can derive sensitive facts from values stored or inferred on-chain. Numerical credit scores directly encode financial behavior patterns and can be correlated with income, debt ratios, or default probability. Even if hashed, the low entropy of a limited range (300–850) allows brute‑force reversal and reconstruction of the exact score. Once reversed, the chain becomes a public broadcast of an individual’s private financial state.

#### Why These Matter Despite Wanting Transparency

Transparency of _mechanics_ (how scoring works, how consent is enforced, how access is logged) does not require transparency of _raw personal metrics_. Public blockchains expose all state permanently. A transparent, immutable audit of _who accessed what_ is desirable; a transparent broadcast of every user’s precise credit score is not.

Low entropy of fine-grained categories becomes a security problem when the value is **small enough to brute-force and uniquely identifying when recovered**.
Our initial idea of numerical credit scores (300–850) fit this pattern:

- The search space is tiny
- A recovered score is highly specific to one individual
- Public chains make brute-force reversal trivial and permanent

Coarse numerical ranges as categorical buckets avoid this:

- The value reveals almost nothing about the individual
- Many users share the same tier
- Hash reversal yields no sensitive detail because the tier is already low-precision
- Even if reversed, it cannot reconstruct raw financial records

Hence, we chose to implement the latter.

### Mitigation

Only categorical tiers and hashed commitments are stored on-chain. The tier restricts what can be inferred. The commitment binds the off-chain value without revealing it.

#### Category (on-chain, readable)

- Tells the public _“this user is in bracket X.”_
- Useful for lenders, analytics, and quick on-chain policy checks (e.g., eligibility)
- Not cryptographically tied to the real score
- Cannot prove integrity across time: a user may later change the off-chain score they show to different lenders

#### Hash commitment (on-chain, opaque)

- Tells an authorized verifier _“the off-chain score you received is the one the user committed to; it has not been tampered with.”_
- Cryptographically binds the real score to the chain state
- Prevents a user from fabricating or modifying the off-chain score after registration
- Allows a lender to verify the off-chain value by hashing it and comparing to the commitment
- Provides immutable auditability without exposing the value itself

### Chosen Identity Attributes

- UserID: unique identifier; independent of legal identity
- Email: contact channel; hashed before on-chain storage
- AccountReference: pointer to off-chain financial data store
- CreditTier: categorical indicator (e.g. `A/B/C`)
- IncomeBracket: coarse-grained range
- DebtRatioBracket: coarse-grained range

---

## **A. Data Model**

#### On vs Off-Chain Allocation of Attributes

Opaque on-chain data (hashes) exists to ensure integrity, not readability.
A hash on-chain proves the off-chain value existed, was unaltered, and was bound to a specific identity and consent state at a specific time.
It enables verifiable access control and auditability without exposing the underlying financial details.

Chain stores verifiable commitments; off-chain system stores the data itself.

| Attribute          | On-Chain | Off-Chain | Hashed |
| ------------------ | -------- | --------- | ------ |
| UserId             | Yes      | No        | No     |
| Email              | Yes      | Yes       | Yes    |
| AccountReference   | No       | Yes       | Yes    |
| CreditTier         | Yes      | No        | No     |
| IncomeBracket      | Yes      | No        | No     |
| DebtRatioBracket   | Yes      | No        | No     |
| AuditLogEvents     | Yes      | No        | No     |
| Raw Financial Data | No       | Yes       | Yes    |

# Consent Model

> **"Call"**: an externally owned account or contract executes a message call targeting a contract function.

## **Workflow: Bank-Verified User Registration**

1. **Bank Verifies Identity & Patrimony:** The **Partner Bank** completes the required legal (KYC/AML) and financial (patrimony assessment) verification for the user.
2. **Bank Prepares ID Data:** The **Partner Bank's** approved system account prepares a transaction containing the **User's pseudonymous ID** (e.g., a hash of a unique bank ID) and a timestamp.
3. **Bank Calls Registration:** The **Partner Bank** signs a transaction calling the platform's IdentityManager contract: registerUser(bankID, pseudonym)
4. **IdentityManager Creates Record:** The IdentityManager contract creates an immutable UserIdentity struct containing: {pseudonym, bankID, registrationTimestamp, onboardingAuthority: bankAddress}.
5. **IdentityManager Stores ID:** The contract stores this struct and maps the **pseudonym** to the **User's address**, effectively creating the **verified digital identity** on the platform.
6. **User Profile Activation:** The **User** is notified, and their wallet address is now recognized by the platform as a **verified identity**, ready to manage consent.

## Workflow: Consent Grant

1. borrower signs a transaction calling `grantConsent(lender, scopes, durationSeconds)`
2. `ConsentManager` creates a consent struct `{borrower, lender, scopes[], startBlockTime, expiryBlockTime, isRevoked=false}`
3. `ConsentManager` stores this struct under `consentId`, the hash of the set of fields

## Workflow: Data Fetch with Consent Check

1. lender sends a data access request to `OffChainStore`
2. `OffChainStore` queries `ConsentManager` with `checkConsent(borrower, scope)`
3. `ConsentManager` returns `valid` or `invalid`
4. `OffChainStore` serves encrypted financial data only if valid

## Workflow: Revocation

1. borrower signs a transaction calling `revokeAllConsentslender)`
2. `ConsentManager` resolves instance with `consentId` & sets the `revoked` field to `true`
3. subsequent checks for `consents[consentId]` resolve to `invalid`

## Token Incentives

Our system purposefully excludes a token-based reward mechanism for data sharing. The primary value proposition is **privacy preservation and transparency of the mechanism for credit verification**, not the monetization of personal data. Introducing financial rewards for granting consent could create perverse incentives, encouraging users to compromise their privacy for short-term gain, which undermines the platform's core mission of sovereign identity and controlled, minimal disclosure.

# Testing

The test suite validates all core platform functionality using Foundry's Solidity testing framework. Tests are organized into three files covering unit tests, integration tests, and end-to-end workflows.

## Test Summary

| Test Suite           | Tests Passing | Tests Failing | Total  |
| -------------------- | :-----------: | :-----------: | :----: |
| ConsentManager.t.sol |      10       |       0       |   10   |
| CreditRegistry.t.sol |      19       |       1       |   20   |
| EndToEnd.sol         |       4       |       3       |   7    |
| **Total**            |    **33**     |     **4**     | **37** |

<!-- TODO are log assertions valid in test context ? intuitively, `log` emission will be non-deterministic if we do not await for emission ? -->

> **Note:** The 4 failing tests are related to event emission assertions (`log != expected log`), not functional failures.

## Tested Functionality and Design Rationale

<!-- TODO should we remove 'description' column from all tables below to reduce verbosity ? -->

### Identity Registration Tests

| Test                                                     | Description                                                                                             | Why Critical                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `test_RegisterIdentityAttributesSuccessfully`            | Verifies users can register with hashed email, credit tier, income/debt brackets, and account reference | Core requirement: users must establish on-chain identity before participating in the consent system  |
| `test_RevertDuplicateRegistration`                       | Prevents same address from registering twice                                                            | Ensures identity uniqueness; prevents Sybil attacks and duplicate identity claims                    |
| `test_RevertRegistrationWithInvalidEmailHash`            | Rejects zero-hash email                                                                                 | Enforces data integrity; email hash is required for off-chain contact verification                   |
| `test_RevertRegistrationWithEmptyCreditTier`             | Rejects empty credit tier                                                                               | Ensures minimum viable profile; lenders need categorical tier for basic eligibility checks           |
| `test_RevertRegistrationWithInvalidAccountReferenceHash` | Rejects zero-hash account reference                                                                     | Account reference links on-chain identity to off-chain data store; essential for hybrid architecture |

### Consent Management Tests

| Test                                      | Description                                                                 | Why Critical                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `test_WorkflowConsentGrant`               | Verifies consent creation with borrower, lender, scopes, start/expiry times | Core workflow: borrowers must be able to delegate time-limited access to specific lenders  |
| `test_WorkflowDataFetchWithConsentCheck`  | Validates `checkConsent` returns true for granted scopes, false otherwise   | Enforces access control; off-chain store relies on this to gate data release               |
| `test_WorkflowRevocation`                 | Confirms `revokeAllConsents` invalidates all active consents to a lender    | Essential for user control: immediate revocation is a key privacy guarantee                |
| `test_ConsentExpiration`                  | Verifies consents become invalid after expiry time                          | Time-bounded access prevents indefinite exposure; aligns with data minimization principles |
| `test_MultipleLendersIndependentConsents` | Confirms revoking one lender's consent doesn't affect others                | Granular control: users manage each lender relationship independently                      |
| `test_MultipleConsentsToSameLender`       | Validates multiple scope-specific consents to same lender                   | Supports fine-grained permissions; lender may need different scopes at different times     |
| `test_LargeScaleGrantCreation`            | Stress test with 50 users × 50 lenders (7,350 consents)                     | Validates scalability and gas predictability under realistic multi-party load              |

### Data Fetch and Access Control Tests

| Test                                      | Description                                                   | Why Critical                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `test_Workflow_DataFetchWithConsentCheck` | Full flow: register → grant → check → retrieve reference hash | Validates complete data access workflow from registration to off-chain data pointer retrieval        |
| `test_Workflow_DataFetchWithoutConsent`   | Verifies `checkConsent` returns false when no consent exists  | Prevents unauthorized access; default-deny security model                                            |
| `test_Workflow_EnforceScopeRestrictions`  | Confirms lenders can only access explicitly granted scopes    | Enforces principle of least privilege; scope-level access control                                    |
| `test_ReadPublicAttributesWithoutConsent` | Public categorical tiers readable without consent             | Design decision: coarse-grained tiers (A/B/C) are intentionally public for basic eligibility queries |

### Identity Update Tests

| Test                                             | Description                                          | Why Critical                                                           |
| ------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `test_UpdateCreditTierSuccessfully`              | Verifies selective field updates                     | Users must update financial status as circumstances change             |
| `test_UpdateMultipleFields`                      | Confirms batch updates to multiple attributes        | Efficiency: single transaction for multiple changes                    |
| `test_PartialUpdatePreservesOtherFields`         | Empty strings preserve existing values               | UX: users update only what changed without resubmitting entire profile |
| `test_RevertUpdateForNonExistentIdentity`        | Prevents updates to unregistered addresses           | Data integrity: cannot modify non-existent records                     |
| `test_MaintainDataIntegrityAfterMultipleUpdates` | Verifies data consistency through sequential updates | Ensures idempotent, predictable state transitions                      |

### Audit Logging Tests

| Test                                 | Description                                                 | Why Critical                                                         |
| ------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `test_EndToEndFlow`                  | Verifies audit entries created for registration and updates | Immutable audit trail is core value proposition; proves data lineage |
| `test_FailedAccessLogging`           | Logs unauthorized access attempts                           | Security: detects and records suspicious activity for forensics      |
| `test_AuditLogAuthorizationRequired` | Prevents unauthorized contracts from writing logs           | Log integrity: only authorized contracts can append audit entries    |

### End-to-End Workflow Tests

| Test                         | Description                                                                     | Why Critical                                             |
| ---------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `test_EndToEndFlow`          | Complete flow: deploy → register → consent → access → update → audit            | Validates all components integrate correctly as a system |
| `test_RevocationFlow`        | Full revocation lifecycle including `revokeConsentById` and `revokeAllConsents` | Confirms both revocation methods work end-to-end         |
| `test_ConsentExpirationFlow` | Time-based consent invalidation via `vm.warp`                                   | Validates temporal access control enforcement            |

## Gas Cost Summary

### Deployment Costs

| Contract       |           Gas | Cost (30 gwei, $3,500 ETH) |
| -------------- | ------------: | -------------------------: |
| AuditLog       |     1,535,406 |                      ~$161 |
| ConsentManager |     1,356,516 |                      ~$142 |
| CreditRegistry |     1,827,755 |                      ~$192 |
| **Total**      | **4,719,677** |                  **~$495** |

### Average Gas per Function

| Function                   | Avg Gas | Est. Cost (USD) |
| -------------------------- | ------: | --------------: |
| registerIdentityAttributes | 244,734 |         ~$25.70 |
| grantConsent               | 192,238 |         ~$20.20 |
| checkConsent               | 406,272 |         ~$42.66 |
| revokeConsentById          |  50,853 |          ~$5.34 |
| revokeAllConsents          |  65,567 |          ~$6.89 |
| updateIdentityAttributes   |  73,606 |          ~$7.73 |
| getIdentityAttributes      |   5,260 |          ~$0.55 |
| isConsentValid             |   1,220 |          ~$0.13 |

# Deployment

## Instructions

For detailed setup and deployment instructions, please refer to the [project's main README file](../README.md). The following sections provide a summary of gas usage and cost analysis based on those instructions.

## Gas Usage Statistics

The below metrics were collected from profiling tests using `bunx hardhat test --gas-stats`. The large-scale test simulates **50 users** interacting with **50 lenders**, creating approximately **7,350 consent grants**, **2,450 consent checks**, and **7,350 revocations**.

### Contract Deployment Costs

| Contract       | Deployment Gas | Contract Size (bytes) |
| -------------- | -------------: | --------------------: |
| AuditLog       |      1,535,406 |                 6,832 |
| ConsentManager |      1,356,516 |                 6,073 |
| CreditRegistry |      1,827,755 |                 8,619 |
| **Total**      |  **4,719,677** |            **21,524** |

### Per-Operation Gas Costs

#### ConsentManager Operations

| Function            | Min Gas | Average Gas | Median Gas | Max Gas | # Calls |
| ------------------- | ------: | ----------: | ---------: | ------: | ------: |
| grantConsent        | 191,852 |     192,238 |    192,080 | 232,053 |   7,370 |
| checkConsent        |  26,731 |     406,272 |    410,168 | 766,064 |   2,476 |
| revokeConsentById   |  50,830 |      50,853 |     50,854 |  50,854 |   7,351 |
| revokeAllConsents   |  52,982 |      65,567 |     53,198 | 110,950 |       5 |
| isConsentValid      |   1,098 |       1,220 |      1,220 |   1,229 |   7,359 |
| getBorrowerConsents |   2,649 |      61,692 |     62,873 |  62,873 |      51 |
| getScopes           |   1,697 |       1,906 |      1,906 |   2,114 |       2 |
| consents (mapping)  |   1,840 |       1,840 |      1,840 |   1,840 |       3 |

#### CreditRegistry Operations

| Function                   | Min Gas | Average Gas | Median Gas | Max Gas | # Calls |
| -------------------------- | ------: | ----------: | ---------: | ------: | ------: |
| registerIdentityAttributes | 186,442 |     244,734 |    186,454 | 361,300 |      18 |
| updateIdentityAttributes   |  37,499 |      73,606 |     37,595 | 200,832 |       5 |
| getIdentityAttributes      |   5,260 |       5,260 |      5,260 |   5,260 |      10 |
| hasIdentityAttributes      |     961 |       1,761 |        961 |   2,961 |       5 |
| getAccountReferenceHash    |     851 |         851 |        851 |     851 |       3 |
| setAuditLog                |  44,125 |      44,125 |     44,125 |  44,125 |       8 |
| consentManager             |   2,748 |       2,748 |      2,748 |   2,748 |       1 |

#### AuditLog Operations

| Function        | Min Gas | Average Gas | Median Gas | Max Gas | # Calls |
| --------------- | ------: | ----------: | ---------: | ------: | ------: |
| authorizeLogger |  47,587 |      47,587 |     47,587 |  47,587 |       8 |
| getAuditEntry   |   2,614 |       2,614 |      2,614 |   2,614 |       1 |
| getLogsCount    |     440 |         440 |        440 |     440 |       1 |

### Scalability Analysis (50 Users × 50 Lenders)

| Metric                   | Value |
| ------------------------ | ----: |
| Total User-Lender Pairs  | 2,450 |
| Consent Grants Created   | 7,370 |
| Consent Checks Performed | 2,476 |
| Consent Revocations      | 7,351 |
| Validity Checks          | 7,359 |

### Cost Estimation at Scale

Assuming 30 gwei gas price and ETH at $3,500:

| Operation               | Gas Used  | Cost (ETH) | Cost (USD) |
| ----------------------- | --------- | ---------- | ---------- |
| Full System Deployment  | 4,719,677 | 0.1416     | ~$495      |
| Register Identity (avg) | 244,734   | 0.0073     | ~$25.70    |
| Grant Consent (avg)     | 192,238   | 0.0058     | ~$20.20    |
| Check Consent (avg)     | 406,272   | 0.0122     | ~$42.66    |
| Revoke Consent (avg)    | 50,853    | 0.0015     | ~$5.34     |

### Observations After 7,350+ Consent Operations

1. **Consent Granting** scales linearly with constant gas per operation (~192k gas).
2. **Consent Checking** dynamic cost based on the number of active consents to iterate through (26k–766k gas).
3. **Revocation** at ~51k gas per consent, it is efficient & practical for users to manage access.
4. **Read Operations** `(getIdentityAttributes, hasIdentityAttributes)` are inexpensive (~1k–5k gas), suitable for frequent verification queries.
