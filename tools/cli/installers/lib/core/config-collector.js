/**
 * Config Collector — writes config.yaml files for each module
 */
const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('yaml');

class ConfigCollector {
  /**
   * Write module config files based on user answers
   * @param {string} prrDir - _prr directory path
   * @param {Object} config - User-provided config values
   */
  async writeConfigs(prrDir, config) {
    // Core config
    const coreConfigPath = path.join(prrDir, 'core', 'config.yaml');
    await fs.ensureDir(path.dirname(coreConfigPath));

    const coreConfig = {
      user_name: config.userName || 'Reviewer',
      communication_language: config.communicationLanguage || 'English',
      output_folder: config.outputFolder || '_prr-output',
    };
    await fs.writeFile(coreConfigPath, yaml.stringify(coreConfig, { indent: 2 }), 'utf8');

    // PRR module config
    if (config.selectedModules && config.selectedModules.includes('prr')) {
      const prrConfigPath = path.join(prrDir, 'prr', 'config.yaml');
      await fs.ensureDir(path.dirname(prrConfigPath));

      const outputFolderAbs = path.join(config.projectDir, config.outputFolder || '_prr-output');
      const reviewOutput = path.join(outputFolderAbs, 'reviews').replaceAll('\\', '/');

      const prrConfig = {
        ...coreConfig,
        project_name: config.projectName || path.basename(config.projectDir),
        target_repo: config.targetRepo || '.',
        platform: config.platform || 'auto',
        platform_repo: config.platformRepo || config.githubRepo || '',
        review_output: reviewOutput,
      };
      await fs.writeFile(prrConfigPath, yaml.stringify(prrConfig, { indent: 2 }), 'utf8');
    }
  }
}

module.exports = { ConfigCollector };
