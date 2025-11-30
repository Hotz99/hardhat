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

### Banking Partnership & Value Proposition

**Our foundational premise:** Society operates on trust in established banking
institutions to accurately evaluate patrimony and track asset ownership.
Banks
are financially incentivized to maintain this trust—their credibility
directly
translates to their competitive position and profitability. This creates a
natural alignment of interests.

**Our partnership model:** Rather than competing with banks, we position
ourselves
as an infrastructure provider. We would partner with established,
well-regarded
banking institutions to onboard their existing customer base onto our
platform

### Why banks would adopt our system

- Transparency attracts clients
  Our blockchain-based system offers complete mechanical transparency—every consent grant, revocation, and access
  attempt is immutably logged and auditable. In an era of increasing data
  breach concerns and privacy regulations, this transparency becomes a
  competitive differentiator for partner banks.
- Enhanced customer trust: By offering verifiable proof that customer data
  is accessed only with explicit, time-bound consent, banks can strengthen
  their relationship with privacy-conscious customers.
- Complementary services, not competition: We provide credit verification
  infrastructure, not banking services. Banks retain their core
  business—lending, accounts, financial products—while outsourcing the consent
  management and audit trail to our decentralized platform.
- Regulatory compliance advantage: An immutable audit trail of all data
  access events simplifies compliance with data protection regulations (GDPR,
  CCPA, etc.) and provides verifiable proof of proper data handling in case of audits.

### The delegation model: Why Banks Should Be the Onboarding Authority

Making a trusted bank the initial registration authority leverages their existing, legally mandated processes and solves a critical problem for a decentralized system: The Oracle Problem (how to get trusted real-world data/identity onto the blockchain).

1. Identity Verification (KYC/AML)

Banks are legally required to perform KYC (Know Your Customer) and AML (Anti-Money Laundering) checks to establish a verified, real-world identity for every account holder.

By delegating onboarding to the bank, we automatically inherit a vetted identity.

2. Patrimony Assessment & Credit Context

The bank is the source of the high-quality, verified financial data (patrimony, income, account history) that forms the basis for lending decisions.

The act of the bank registering the user signals that the user has a verified financial relationship and a pre-existing level of financial trust. This is the trusted context needed for our credit verification platform.

3. Regulatory Compliance & Risk Mitigation

## System Roles

**User (Borrower/Identity Owner)**

- Individual who owns the data and the digital identity.
- Cannot directly initiate registration; are registered by a Partner Bank after KYC/patrimony vetting.
- Manages consent settings (granting and revoking access to their data).

**Partner Bank (Onboarding & Requester Authority)**

- Established financial institution acting as both the initial identity validator and potential data requester.
- Performs the initial customer identity verification and patrimony assessment (KYC/AML); uses a dedicated account to register the User's unique (but pseudonymous) ID onto the platform.
- Acts as a Lender that requests access to a User's data to verify creditworthiness, which requires obtaining valid consent.

**Requester (Third-Party Lender)**
Any other entity (e.g., a non-partner financial service, small lender) that requests access to the User's data. They must obtain valid consent before accessing any information and have no onboarding authority.

**Administrator**
Responsible for initial deployment and configuration of smart contracts and technical setup of all Partner Bank/Requester accounts.

## Functional Requirements

1. **User Registration:** Users can register a digital identity using hashed attributes (e.g., email hash) to ensure privacy while maintaining uniqueness.
2. **Consent Management:** Users can grant granular, time-limited consent to specific Requesters for specific ~~data types~~ **identity attributes** (scopes).
3. **Consent Revocation:** Users have the ability to revoke previously granted consents at any time, immediately invalidating further access.
4. **Audit Logging:** Every access attempt to the off-chain data is logged on-chain. This includes both successful accesses (authorized) and failed attempts (unauthorized), creating an immutable audit trail.
5. **(TODO vet this) Incentivization:** The system includes a mechanism to reward users with tokens when they grant consent for data sharing.

## System Overview: High Level User-System Interaction

Our platform empowers users with sovereign control over their financial identity through a hybrid architecture that bridges trusted banking with decentralized privacy.

- **Trusted Onboarding**: Partner Banks verify users via existing KYC processes and register them on-chain, ensuring high-quality identity without exposing raw data.
- **Granular Consent**: Users explicitly grant or revoke time-bound access to Lenders, ensuring data is only shared with permission.
- **Privacy-Preserving Verification**: Lenders verify creditworthiness through the blockchain, which enforces consent checks before releasing off-chain data.
- **Immutable Audit**: All consent changes and access attempts are permanently logged, guaranteeing transparency and accountability.

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

<!-- TODO vet this account for the initial onboarding done by banks -->

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
| ConsentManager.t.sol |      9        |       0       |   9    |
| CreditRegistry.t.sol |      24       |       0       |   24   |
| EndToEnd.sol         |       8       |       0       |   8    |
| **Total**            |    **41**     |     **0**     | **41** |


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
| `test_DuplicatePrevention`                | Ensures identical borrower→lender consents cannot be created twice         | Prevents ID collisions and enforces one active consent per scope-duration pair             |
| `test_FullWorkflowSingleLender`           | Runs full lifecycle: grant, validate, authorize, revoke, post-revocation   | End-to-end guarantee that all core consent operations behave correctly in sequence         |
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
| ConsentManager |     1,419,830 |                      ~$149 |
| CreditRegistry |     1,827,755 |                      ~$192 |
| **Total**      | **4,782,991** |                  **~$495** |

### Average Gas per Function

| Function                   | Avg Gas | Est. Cost (USD) |
| -------------------------- | ------: | --------------: |
| registerIdentityAttributes | 244,734 |         ~$25.70 |
| grantConsent               | 192,833 |         ~$20.25 |
| checkConsent               | 405,830 |         ~$42.61 |
| revokeConsentById          |  50,853 |          ~$5.34 |
| revokeAllConsents          |  64,618 |          ~$6.78 |
| updateIdentityAttributes   |  96,689 |         ~$10.15 |
| getIdentityAttributes      |  17,260 |          ~$1.81 |
| isConsentValid             |   7,219 |          ~$0.76 |

# Deployment

## Instructions

For detailed setup and deployment instructions, please refer to the [project's main README file](../README.md). The following sections provide a summary of gas usage and cost analysis based on those instructions.

## Gas Usage Statistics

The below metrics were collected from profiling tests using `bunx hardhat test --gas-stats`. The large-scale test simulates **50 users** interacting with **50 lenders**, creating approximately **7,350 consent grants**, **2,450 consent checks**, and **7,350 revocations**.

### Contract Deployment Costs

| Contract       | Deployment Gas | Contract Size (bytes) |
| -------------- | -------------: | --------------------: |
| AuditLog       |      1,535,406 |                 6,832 |
| ConsentManager |      1,419,830 |                 6,368 |
| CreditRegistry |      1,827,755 |                 8,619 |
| **Total**      |  **4,719,677** |            **21,524** |

### Per-Operation Gas Costs

#### ConsentManager Operations

| Function            | Min Gas | Average Gas | Median Gas | Max Gas | # Calls |
| ------------------- | ------: | ----------: | ---------: | ------: | ------: |
| checkConsent        |  26,731 |     405,830 |    410,168 | 766,064 |   2,479 |
| consents (mapping)  |  11,840 |      11,840 |     11,840 |  11,840 |       3 |
| getBorrowerConsents |  10,649 |     345,480 |    358,873 | 358,873 |      52 |
| getScopes           |   5,697 |       6,906 |      6,906 |   8,114 |       2 |
| grantConsent        | 192,433 |     192,833 |    192,673 | 232,646 |   7,374 |
| isConsentValid      |   5,098 |       7,219 |      7,220 |   7,229 |   7,361 |
| revokeAllConsents   |  52,982 |      64,618 |     55,461 | 110,950 |       6 |
| revokeConsentById   |  50,830 |      50,853 |     50,854 |  50,854 |   7,351 |

#### CreditRegistry Operations

| Function                   | Min Gas | Average Gas | Median Gas | Max Gas | # Calls |
| -------------------------- | ------: | ----------: | ---------: | ------: | ------: |
| consentManager             |   2,748 |       2,748 |      2,748 |   2,748 |       1 |
| getAccountReferenceHash    |   2,851 |       2,851 |      2,851 |   2,851 |       4 |
| getIdentityAttributes      |  17,260 |      17,260 |     17,260 |  17,260 |      11 |
| hasIdentityAttributes      |   2,961 |       2,961 |      2,961 |   2,961 |       5 |
| registerIdentityAttributes | 186,442 |     244,734 |    186,454 | 361,300 |      18 |
| setAuditLog                |  44,125 |      44,125 |     44,125 |  44,125 |       8 |
| updateIdentityAttributes   |  37,499 |      96,689 |     46,099 | 212,104 |       6 |

#### AuditLog Operations

| Function        | Min Gas | Average Gas | Median Gas | Max Gas | # Calls |
| --------------- | ------: | ----------: | ---------: | ------: | ------: |
| authorizeLogger |  47,587 |      47,587 |     47,587 |  47,587 |       8 |
| getAccessHistory│   8,233 │       8,233 │      8,233 │   8,233 │       1 |
| getAuditEntry   |  14,614 |      14,614 |     14,614 |  14,614 |       2 |
| getLogsCount    |   2,440 |       2,440 |      2,440 |   2,440 |       2 |
| getRecentLogs   |  28,361 |      28,361 |     28,361 |  28,361 |       1 |

### Scalability Analysis (50 Users × 50 Lenders)

| Metric                   | Value |
| ------------------------ | ----: |
| Total User-Lender Pairs  | 2,450 |
| Consent Grants Created   | 7,350 |
| Consent Checks Performed | 2,450 |
| Consent Revocations      | 7,350 |
| Validity Checks          | 7,350 |

### Cost Estimation at Scale

Assuming 30 gwei gas price and ETH at $3,500:

| Operation               | Gas Used  | Cost (ETH) | Cost (USD) |
| ----------------------- | --------- | ---------- | ---------- |
| Full System Deployment  | 4,782,991 | 0.1435     | ~$502.25   |
| Register Identity (avg) | 244,734   | 0.0073     | ~$25.70    |
| Grant Consent (avg)     | 192,833   | 0.0058     | ~$20.25    |
| Check Consent (avg)     | 405,830   | 0.0122     | ~$42.61    |
| Revoke Consent (avg)    | 50,853    | 0.0015     | ~$5.34     |

### Observations After 7,350+ Consent Operations

1. **Consent Granting** scales linearly with constant gas per operation (~192k gas).
2. **Consent Checking** dynamic cost based on the number of active consents to iterate through (26k–766k gas).
3. **Revocation** at ~51k gas per consent, it is efficient & practical for users to manage access.
4. **Read Operations** `(getIdentityAttributes, hasIdentityAttributes)` are inexpensive (~3k–17k gas), suitable for frequent verification queries.
