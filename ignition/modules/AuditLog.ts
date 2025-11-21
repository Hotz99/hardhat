import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AuditLogModule = buildModule("AuditLogModule", (m) => {
  const auditLog = m.contract("AuditLog");

  return { auditLog };
});

export default AuditLogModule;
