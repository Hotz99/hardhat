import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CreditRegistryModule = buildModule("CreditRegistryModule", (m) => {
  // TODO resolve deployed ConsentManager address from local testnet
  const consentManagerAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const creditRegistry = m.contract("CreditRegistry", [consentManagerAddress]);

  return { creditRegistry };
});

export default CreditRegistryModule;
