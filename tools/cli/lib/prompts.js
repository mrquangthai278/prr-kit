/**
 * Prompts — wrapper around @clack/prompts for consistent CLI output
 */
const clack = require('@clack/prompts');

const log = {
  info: async (msg) => clack.log.info(msg),
  success: async (msg) => clack.log.success(msg),
  warn: async (msg) => clack.log.warn(msg),
  error: async (msg) => clack.log.error(msg),
  message: async (msg) => clack.log.message(msg),
  step: async (msg) => clack.log.step(msg),
};

module.exports = { ...clack, log };
