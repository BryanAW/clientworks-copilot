import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT_LOG_PATH = path.join(__dirname, '../logs/audit.jsonl')

/**
 * Append a log entry to the audit log file (JSONL format)
 * @param {Object} entry - Log entry to append
 * @param {string} entry.action - Action name (e.g., 'CLIENT_VIEWED')
 * @param {string} entry.details - Human-readable details
 * @param {Object} entry.metadata - Additional metadata
 */
export function logAudit(entry) {
  // TODO: Add timestamp, user context, etc.
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    ...entry,
  }

  try {
    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(logEntry) + '\n')
    console.log(`[AUDIT] ${entry.action}: ${entry.details}`)
  } catch (err) {
    console.error('Failed to write audit log:', err)
  }
}

/**
 * Read audit logs (TODO: pagination, filtering)
 */
export function readAuditLogs(limit = 50) {
  try {
    if (!fs.existsSync(AUDIT_LOG_PATH)) {
      return []
    }

    const content = fs.readFileSync(AUDIT_LOG_PATH, 'utf-8')
    const lines = content.split('\n').filter((line) => line.trim())

    return lines.map((line) => JSON.parse(line)).slice(-limit)
  } catch (err) {
    console.error('Failed to read audit logs:', err)
    return []
  }
}
