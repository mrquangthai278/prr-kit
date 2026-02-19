/**
 * Template Engine — processes agent YAML with variable substitution
 * Handles variable substitution for agent YAML configuration
 */

/**
 * Recursively replace {variable} placeholders in strings/objects/arrays
 * @param {any} value - Value to process
 * @param {Object} vars - Variable map
 * @returns {any} Processed value
 */
function replacePlaceholders(value, vars) {
  if (typeof value === 'string') {
    return value.replaceAll(/\{(\w+)\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
    });
  }
  if (Array.isArray(value)) {
    return value.map((item) => replacePlaceholders(item, vars));
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = replacePlaceholders(v, vars);
    }
    return result;
  }
  return value;
}

/**
 * Extract install_config section from agent YAML
 */
function extractInstallConfig(agentYaml) {
  return agentYaml.install_config || null;
}

/**
 * Strip install_config from processed YAML
 */
function stripInstallConfig(agentYaml) {
  const { install_config, ...rest } = agentYaml;
  return rest;
}

/**
 * Get default values from install_config questions
 */
function getDefaultValues(installConfig) {
  const defaults = {};
  if (!installConfig || !installConfig.questions) return defaults;
  for (const q of installConfig.questions) {
    if (q.id && q.default !== undefined) {
      defaults[q.id] = q.default;
    }
  }
  return defaults;
}

/**
 * Process agent YAML with variable substitution
 */
function processAgentYaml(agentYaml, answers = {}) {
  return replacePlaceholders(agentYaml, answers);
}

module.exports = {
  processAgentYaml,
  extractInstallConfig,
  stripInstallConfig,
  getDefaultValues,
  replacePlaceholders,
};
