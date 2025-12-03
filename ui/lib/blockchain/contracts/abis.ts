/**
 * Contract ABIs extracted from Hardhat deployment artifacts
 *
 * @since 1.0.0
 * @category Contracts
 */

export const CreditRegistryAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_consentManager",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "IdentityAttributesNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidConsentManager",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedUpdate",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "userId",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "unixTimestamp",
        "type": "uint256"
      }
    ],
    "name": "IdentityAttributesRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "unixTimestamp",
        "type": "uint256"
      }
    ],
    "name": "IdentityAttributesUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "accountReferenceHashes",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "auditLog",
    "outputs": [
      {
        "internalType": "contract AuditLog",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "consentManager",
    "outputs": [
      {
        "internalType": "contract ConsentManager",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getAccountReferenceHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getIdentityAttributes",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "userId",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "emailHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "creditTier",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "incomeBracket",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "debtRatioBracket",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "lastUpdated",
            "type": "uint256"
          }
        ],
        "internalType": "struct ICreditRegistry.IdentityAttributes",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "hasIdentityAttributes",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "identityAttributes",
    "outputs": [
      {
        "internalType": "address",
        "name": "userId",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "emailHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "creditTier",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "incomeBracket",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "debtRatioBracket",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "lastUpdated",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "emailHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "creditTier",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "incomeBracket",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "debtRatioBracket",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "accountReferenceHash",
        "type": "bytes32"
      }
    ],
    "name": "registerIdentityAttributes",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_auditLog",
        "type": "address"
      }
    ],
    "name": "setAuditLog",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "emailHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "creditTier",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "incomeBracket",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "debtRatioBracket",
        "type": "string"
      }
    ],
    "name": "updateIdentityAttributes",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "borrower",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "scope",
        "type": "bytes32"
      }
    ],
    "name": "requestDataAccess",
    "outputs": [
      {
        "internalType": "bool",
        "name": "authorized",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const ConsentManagerAbi = [
  {
    "inputs": [],
    "name": "ConsentAlreadyRevoked",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ConsentExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ConsentNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedRevocation",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "consentId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "borrower",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "lender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32[]",
        "name": "scopes",
        "type": "bytes32[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startBlockTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expiryBlockTime",
        "type": "uint256"
      }
    ],
    "name": "ConsentGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "consentId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "querier",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "authorized",
        "type": "bool"
      }
    ],
    "name": "ConsentQueried",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "consentId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "borrower",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "lender",
        "type": "address"
      }
    ],
    "name": "ConsentRevoked",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "borrowerConsents",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "borrower",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "scope",
        "type": "bytes32"
      }
    ],
    "name": "checkConsent",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "consents",
    "outputs": [
      {
        "internalType": "address",
        "name": "borrower",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "lender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "startBlockTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiryBlockTime",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isRevoked",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "borrower",
        "type": "address"
      }
    ],
    "name": "getBorrowerConsents",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "consentId",
        "type": "bytes32"
      }
    ],
    "name": "getScopes",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "lender",
        "type": "address"
      },
      {
        "internalType": "bytes32[]",
        "name": "scopes",
        "type": "bytes32[]"
      },
      {
        "internalType": "uint256",
        "name": "durationSeconds",
        "type": "uint256"
      }
    ],
    "name": "grantConsent",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "consentId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "consentId",
        "type": "bytes32"
      }
    ],
    "name": "isConsentValid",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "lender",
        "type": "address"
      }
    ],
    "name": "revokeAllConsents",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "consentId",
        "type": "bytes32"
      }
    ],
    "name": "revokeConsentById",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const AuditLogAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InvalidRange",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Unauthorized",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "entryId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "accessor",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "subject",
        "type": "address"
      }
    ],
    "name": "AuditEntryLogged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "logger",
        "type": "address"
      }
    ],
    "name": "LoggerAuthorized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "logger",
        "type": "address"
      }
    ],
    "name": "LoggerRevoked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "logger",
        "type": "address"
      }
    ],
    "name": "authorizeLogger",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getAccessHistory",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "accessor",
        "type": "address"
      }
    ],
    "name": "getAccessorHistory",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "startId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "name": "getAuditEntries",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "accessorUserId",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "subjectUserId",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "hashedScope",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "unixTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "enum IAuditLog.EventType",
            "name": "eventType",
            "type": "uint8"
          }
        ],
        "internalType": "struct IAuditLog.AuditEntry[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "entryId",
        "type": "uint256"
      }
    ],
    "name": "getAuditEntry",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "accessorUserId",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "subjectUserId",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "hashedScope",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "unixTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "enum IAuditLog.EventType",
            "name": "eventType",
            "type": "uint8"
          }
        ],
        "internalType": "struct IAuditLog.AuditEntry",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLogsCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "name": "getRecentLogs",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "accessorUserId",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "subjectUserId",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "hashedScope",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "unixTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "enum IAuditLog.EventType",
            "name": "eventType",
            "type": "uint8"
          }
        ],
        "internalType": "struct IAuditLog.AuditEntry[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "logger",
        "type": "address"
      }
    ],
    "name": "isAuthorizedLogger",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "accessorUserId",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "subjectUserId",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "hashedScope",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "unixTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "enum IAuditLog.EventType",
            "name": "eventType",
            "type": "uint8"
          }
        ],
        "internalType": "struct IAuditLog.AuditEntry",
        "name": "entry",
        "type": "tuple"
      }
    ],
    "name": "logEvent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "logger",
        "type": "address"
      }
    ],
    "name": "revokeLogger",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
