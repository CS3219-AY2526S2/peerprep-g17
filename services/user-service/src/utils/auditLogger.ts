import AuditLog from "../models/AuditLogs"

export async function loggingTheAction(
  performedBy: string,
  action: string,
  targetUser?: string,
) {
  try {
    await AuditLog.create({ performedBy, action, targetUser })
  } catch {
    // to not crash
  }
}