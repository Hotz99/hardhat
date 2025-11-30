# Design Reasoning

## Choices of Storage Types

### `Storage`: Persistent Blockchain Data

Used for state variables that persist across function calls and transactions.

**State Variables Example:**

```solidity
// contracts/ConsentManager.sol:20-21
mapping(bytes32 => Consent) public consents;  // consentId => Consent
mapping(address => bytes32[]) public borrowerConsents;
```

These mappings store consent records permanently on-chain. The `consents` mapping maintains all consent agreements indexed by ID, while `borrowerConsents` tracks which consents each borrower has granted.

**Storage References in Functions:**

```solidity
// contracts/ConsentManager.sol:101-102
Consent storage consent = consents[consentId];

if (consent.borrower == address(0)) {
```

// TODO vet this. i thought the above read once from storage, then copied into a local variable ?
In `isConsentValid()`, we use `storage` reference to read the persistent `Consent` struct from the blockchain without copying it to memory, which is gas-efficient for read-only operations.

```solidity
// contracts/ConsentManager.sol:74-82
consents[consentId] = Consent({
    borrower: msg.sender,
    lender: lender,
    scope: scope,
    expiryTime: expiryTime,
    revoked: false
});

borrowerConsents[msg.sender].push(consentId);
```

In `grantConsent()`, we store consent data permanently using storage variables and maintain the borrower's consent index.

### `Memory` - Temporary Function Data

Used for local variables and return values that exist only during function execution.

**Local Variable Example:**

```solidity
// contracts/ConsentManager.sol:65
uint256 expiryTime = block.timestamp + durationSeconds;

consentId = keccak256(
    abi.encodePacked(
        msg.sender,
        lender,
        scope,
        block.timestamp,
        block.number
    )
);
```

Both `expiryTime` and `consentId` are memory variables computed during function execution. They don't persist after the function completes.

**Return Values as Memory:**

```solidity
// contracts/ConsentManager.sol:177-179
function getBorrowerConsents(address borrower) external view returns (bytes32[] memory) {
    return borrowerConsents[borrower];
}
```

The return type is `bytes32[] memory`, which creates a copy of the storage array in memory before returning it to the caller. This is necessary for external function returns.

### `Calldata` - Function Arguments

Used implicitly for external function parameters, providing gas-efficient read-only access to arguments.

**Function Parameters Example:**

```solidity
// contracts/ConsentManager.sol:125-129
function checkAuthorization(
    address borrower,
    address lender,
    bytes32 scope
) external returns (bool) {
```

Parameters `borrower`, `lender`, and `scope` are in calldata. They're passed from external callers and cannot be modified within the function.

### Optimization with Storage Reference

```solidity
// contracts/ConsentManager.sol:131
bytes32[] storage userConsents = borrowerConsents[borrower];

for (uint256 i = 0; i < userConsents.length; i++) {
    bytes32 consentId = userConsents[i];
    Consent storage consent = consents[consentId];
```

Using `storage` reference to `userConsents` and `consent` avoids copying large data structures to memory. This is more gas-efficient than `bytes32[] memory userConsents = borrowerConsents[borrower]`, especially when only reading data.

## Event Indexing

The `indexed` keyword on event parameters makes them searchable and filterable without scanning all event data.

```solidity
// contracts/ConsentManager.sol:25-31
event ConsentGranted(
    bytes32 indexed consentId,
    address indexed borrower,
    address indexed lender,
    bytes32 scope,
    uint256 expiryTime
);
```

**Why we indexed these three parameters:**

- **`consentId` (indexed)**: Allows efficient queries for a specific consent grant by ID
- **`borrower` (indexed)**: Enables filtering all consents granted by a specific borrower
- **`lender` (indexed)**: Enables filtering all consents granted to a specific lender
- **`scope` & `expiryTime` (not indexed)**: These are searchable but require full event data parsing; they're less critical for real-time filtering

Indexed parameters are stored in log topics (more efficient) rather than log data, making them queryable via blockchain indexers and explorers without parsing event payloads. Solidity limits events to 3 indexed parameters, forcing us to choose the most frequently queried attributes.

## `mapping`s

A `mapping` is a hash table keyed by the declared type:

The below example has `consentId` as a `bytes32` key, not an integer index.
`consents[consentId]` performs a deterministic storage slot derivation, not positional indexing.

```solidity
// contracts/ConsentManager.sol:66-73
// consentId => Consent
mapping(bytes32 => Consent) public consents;
...
consentId = keccak256(
    abi.encodePacked(
        msg.sender,
        lender,
        scope,
        block.timestamp,
        block.number
    )
);

consents[consentId] = Consent({...});
```

The above approach provides:

- **Uniqueness**: Including `msg.sender`, `lender`, `scope`, and block context ensures each consent gets a distinct ID, even for identical lender/scope pairs from the same borrower.
- **Deterministic Lookup**: Given the same parameters, you can regenerate the `consentId` without storing an incrementing counter.

// TODO pretty sure this is incorrect, arrays do provide DMA

- **No Array Indexing Overhead**: Unlike array indices, hash keys avoid positional dependencies; you directly access `consents[consentId]` without iterating.
  // TODO this seems irrelevant
- **Collision Safety**: `keccak256` produces 256-bit hashes with negligible collision probability for practical consent cardinality.

# Optimization Process

## Storage Pointer Caching vs. Direct Memory Access

Intuitively, less (local) variable declarations in memory should imply gas savings. In practice, this does not hold.

**Naive Refactor (More Gas):**

```solidity
// contracts/ConsentManager.sol:97-112 (inefficient version)
// Intuition: avoid the `consent` variable declaration, reduce memory overhead
// Reality: each field access triggers a separate SLOAD

return consents[consentId].borrower != address(0) &&
       !consents[consentId].revoked &&
       block.timestamp <= consents[consentId].expiryTime;
```

This refactor replaces **one** `SLOAD` (storage load) with **three**. Each `consents[consentId].field` lookup computes the storage slot and loads from blockchain state.

**Optimized Form (Less Gas):**

```solidity
// contracts/ConsentManager.sol:97-112 (gas-efficient version)
// Cache the storage pointer; read all fields from that pointer
Consent storage consent = consents[consentId];

if (consent.borrower == address(0)) {
    return false;  // Consent doesn't exist
}

if (consent.revoked) {
    return false;  // Consent was revoked
}

if (block.timestamp > consent.expiryTime) {
    return false;  // Consent expired
}

return true;
```

The storage reference `Consent storage consent = consents[consentId]` caches a pointer to the struct in storage. Subsequent field reads (`consent.borrower`, `consent.revoked`, `consent.expiryTime`) access that single cached pointer, avoiding repeated storage lookups.

// TODO integrate test results from naive vs cached version comparisons
**Gas Impact:**

- **Naive refactor**: 3× `SLOAD` operations (~2,100 gas each = ~6,300 gas)
- **Optimized form**: 1× `SLOAD` + 3× pointer dereferences (~100 gas each = ~2,400 gas)
- **Savings**: ~3,900 gas per call

**Lesson:** Storage pointers are not just stylistic—they're essential for gas efficiency when accessing multiple fields of the same struct.

## Avoiding Public Field Getters

initial version:

```solidity
mapping(address => bytes32[]) public borrowerConsents;
mapping(bytes32 => Consent) public consents;
...
function getBorrowerConsents(address borrower) external view returns (...) {
    return borrowerConsents[borrower];
}

function getConsentDetails(bytes32 consentId) external view returns (...) {
    Consent storage consent = consents[consentId];
    return (
        consent.borrower,
        consent.lender,
        consent.scopes,
        consent.startBlockTime,
        consent.expiryBlockTime,
        consent.isRevoked
    );
}
```

**Our intuition:** Getter functions for public contract fields are a waste of deployment gas.

**Conclusion:** Solidity automatically generates getters for `public` state variables. Manual versions duplicate this, increasing bytecode size and deployment cost with no runtime or functional benefit. Callers pay the same gas to invoke the compiler-generated getters, so removing manual versions saves deployment gas with zero caller impact.

Hence, we removed these.

## Identity Registration Check: Preventing Sybil Attacks

1.  **Goal**: Ensure a unique ID registers only once. Without a check, subsequent registrations would silently overwrite data. The goal is to make second registrations **fail and revert**, signaling that the identity already exists, thus preventing Sybil attacks.

2.  **Mechanics**:
    Solidity

    ```solidity
    require(consents[consentId].lender == address(0), "Consent already exists");
    ```
    *   **First Registration (Success)**: `consents[consentId].lender` is `address(0)`, `require` passes, and a non-zero address is assigned.
    *   **Second Registration (Failure)**: `consents[consentId].lender` now holds an address, so the `require` fails, and the transaction **reverts** with "Consent already exists".

3.  **Sybil Attack Mitigation**: This `require` statement transforms the function from an overwrite operation into a **register-once gate**. It explicitly reverts attempts to register the same identity twice, preventing attackers from receiving benefits multiple times.