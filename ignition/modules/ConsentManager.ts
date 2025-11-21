import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ConsentManagerModule = buildModule("ConsentManagerModule", (m) => {
  const consentManager = m.contract("ConsentManager");

  return { consentManager };
});

export default ConsentManagerModule;
