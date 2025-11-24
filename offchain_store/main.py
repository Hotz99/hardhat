from web3 import Web3
import json
from dataclasses import dataclass


@dataclass
class FinancialRecord:
    borrower: str
    scope: bytes
    payload: str


class OffChainStore:
    def __init__(self, rpc_url, consent_manager_address, consent_manager_abi):
        self.web3 = Web3(Web3.HTTPProvider(rpc_url))
        self.cm = self.web3.eth.contract(
            address=Web3.to_checksum_address(consent_manager_address),
            abi=consent_manager_abi
        )
        # (borrower, hashedScope) -> FinancialRecord
        self.records = {}  

    def register_record(self, borrower, scope_bytes32, payload):
        key = (borrower.lower(), scope_bytes32)
        self.records[key] = FinancialRecord(
            borrower=borrower,
            scope=scope_bytes32,
            payload=payload
        )

    # --------------------------------------------------------
    # core workflow (from `docs/report.md`): lender fetch
    # 1. lender calls OffChainStore
    # 2. store calls ConsentManager.checkConsent
    # 3. valid/invalid returned
    # 4. store returns raw data only if valid
    # --------------------------------------------------------
    def fetch(self, lender, borrower, scope_bytes32):
        borrower = borrower.lower()
        lender = lender.lower()

        # Step 2: chain call to ConsentManager.checkConsent(borrower, scope)
        print(f"DEBUG: Checking consent for borrower={borrower}, lender={lender}, scope={scope_bytes32.hex()}")
        
        try:
            consent_valid = self.cm.functions.checkConsent(
                Web3.to_checksum_address(borrower),
                scope_bytes32
            ).call({"from": Web3.to_checksum_address(lender)})
            
            print(f"DEBUG: Consent valid: {consent_valid}")
        except Exception as e:
            print(f"DEBUG: Error checking consent: {e}")
            return None

        if not consent_valid:
            print("DEBUG: Consent not valid, returning None")
            return None

        # Step 4: serve raw financial data
        record = self.records.get((borrower, scope_bytes32))
        if record:
            print(f"DEBUG: Found record, returning payload")
            return record.payload
        else:
            print(f"DEBUG: No record found for key ({borrower}, {scope_bytes32.hex()})")
            return None


if __name__ == "__main__":
    RPC = "http://127.0.0.1:8545"
    # TODO dynamically derive contract address & ABI after deployment
    # instead of hardcoding
    CONSENT_MANAGER_ADDR = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

    with open("../artifacts/contracts/ConsentManager.sol/ConsentManager.json") as abi_file:
        CONSENT_MANAGER_ABI = json.load(abi_file)["abi"]

    store = OffChainStore(
        rpc_url=RPC,
        consent_manager_address=CONSENT_MANAGER_ADDR,
        consent_manager_abi=CONSENT_MANAGER_ABI
    )

    # keys from `npx hardhat node`
    borrower_pubkey = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    borrower_privkey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

    lender_pubkey = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
    lender_privkey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    
    hashed_identity_attribute = Web3.keccak(text="credit_score")

    print("=== Step 1: Register off-chain record ===")
    
    store.register_record(
        borrower=borrower_pubkey,
        scope_bytes32=hashed_identity_attribute,
        payload="RAW{credit_score:720,income:90000,debt_ratio:0.18}"
    )
    print(f"Registered record for borrower {borrower_pubkey}")

    print("\n=== Step 2: Attempt fetch WITHOUT consent ===")
    
    # attempt fetch without consent
    result = store.fetch(lender_pubkey, borrower_pubkey, hashed_identity_attribute)
    # `result == None` bc no consent granted yet
    print("DATA:", result)   
    
    print("\n=== Step 3: Grant consent on-chain ===")
    # grant consent from borrower to lender
    w3 = store.web3
    borrower_account = w3.eth.account.from_key(borrower_privkey)
    
    # build tx to grant consent from borrower to lender
    consent_manager = store.cm
    borrower_checksum = Web3.to_checksum_address(borrower_pubkey)
    lender_checksum = Web3.to_checksum_address(lender_pubkey)
    nonce = w3.eth.get_transaction_count(borrower_checksum)
    
    # grant consent for 7 days
    duration_seconds = 7 * 24 * 60 * 60
    
    tx = consent_manager.functions.grantConsent(
        lender_checksum,
        # array of scopes
        [hashed_identity_attribute],
        duration_seconds
    ).build_transaction({
        'from': borrower_checksum,
        'nonce': nonce,
        'gas': 2000000,
        'gasPrice': w3.eth.gas_price
    })
    
    signed_tx = borrower_account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    print(f"Consent granted! Transaction: {tx_hash.hex()}")
    print(f"Status: {'Success' if receipt.status == 1 else 'Failed'}")
    
    print("\n=== Step 4: Attempt fetch WITH consent ===")
    # attempt fetch with consent
    result = store.fetch(lender_pubkey, borrower_pubkey, hashed_identity_attribute)
    # should return raw data now
    print("DATA:", result)