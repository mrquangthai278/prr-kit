/**
 * CLI utilities — common helper functions
 */
const path = require('node:path');

/**
 * Resolve a directory path: use provided path or cwd
 */
function resolveDirectory(dir) {
  if (!dir) return process.cwd();
  return path.resolve(dir);
}

/**
 * Parse comma-separated string into array of trimmed non-empty values
 */
function parseList(str) {
  if (!str) return [];
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Get OS username as default fallback
 */
function getSystemUsername() {
  return process.env.USERNAME || process.env.USER || 'Reviewer';
}

module.exports = { resolveDirectory, parseList, getSystemUsername };
