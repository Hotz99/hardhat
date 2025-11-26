# Decentralized Credit Verification System Report

## Problem Statement

Centralized credit reporting systems create significant privacy risks and lack user control. Users are often unaware of who accesses their financial data, and massive data breaches frequently compromise sensitive personal information. Furthermore, users cannot easily revoke access once granted, and there is no immutable, transparent record of data access. We provide a blockchain-based decentralized identity and data sharing platform for the financial domain, specifically for creditworthiness verification, where users retain ownership of their data and control access through revocable, auditable consents. Partner banks would be responsible for initial
customer
identity verification and patrimony assessment (which they already do). They
would then register their verified customers onto our system, delegating
only
the consent management and access control functions to our blockchain
infrastructure while maintaining their trusted role as financial evaluators.

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

Off-chain data must be stored in a controlled environment that implements access gates tied to the on-chain consent state. The chain does not enforce access to arbitrary third-party assets; it enforces access to a storage layer designed to honor its signals.

### Concerns

#### Re‑identifiability

A user becomes re‑identifiable when a data point—alone or combined with other attributes—lets an observer infer who the user is, even if the data is hashed or partially anonymized. High‑precision numerical credit scores act as quasi‑identifiers because they are statistically sparse. A specific score (e.g. 742) appears in far fewer real‑world profiles than a broad tier like “Good” or "A", making it easier to match to external datasets or leaked credit bureau records.

#### Data exposure risk

A system leaks information when an observer can derive sensitive facts from values stored or inferred on-chain. Numerical credit scores directly encode financial behavior patterns and can be correlated with income, debt ratios, or default probability. Even if hashed, the low entropy of a limited range (300–850) allows brute‑force reversal and reconstruction of the exact score. Once reversed, the chain becomes a public broadcast of an individual’s private financial state.

#### Why these matter despite wanting transparency

Transparency of _mechanics_ (how scoring works, how consent is enforced, how access is logged) does not require transparency of _raw personal metrics_. Public blockchains expose all state permanently. A transparent, immutable audit of _who accessed what_ is desirable; a transparent broadcast of every user’s precise credit score is not.

Using categorical tiers preserves transparency of process and validation while constraining what an adversary can infer. It eliminates brute‑force reversibility and prevents unique financial fingerprints from being tied to on-chain identities.

Low entropy of fine-grained categories becomes a security problem only when the value is **small enough to brute-force and uniquely identifying when recovered**.
Numerical credit scores (300–850) fit this pattern:

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
- Communicates minimal information
- Not cryptographically tied to the real score
- Cannot prevent a user from later changing the off-chain score they show to different lenders
- Cannot prove integrity across time

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

// TODO below seems a bit redundant

Categories are intentionally coarse and high-cardinality is low — brute force reversal of a hashed category is trivial, so hashing them doesn't hide anything.
Readable categories are useful for lenders, analytics, and quick on-chain policy checks (e.g., eligibility).
Hashes should bind off-chain, high-entropy or sensitive values (raw score, detailed financial records, account refs, and email/contact) to prevent tampering while keeping data private. Use salts/nonces, timestamps, or a Merkle root to prevent replay/brute-force and to tie a commitment to a specific user/time.

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

**"Call"**: an externally owned account or contract executes a message call targeting a contract function.

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
