/**
 * Detector — detects existing PR Review installations
 */
const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('yaml');

const PRR_FOLDER_NAME = '_prr';

class Detector {
  /**
   * Check if PR Review is installed in the given directory
   * @param {string} projectDir
   * @returns {Object} { installed, version, modules, prrDir }
   */
  async detect(projectDir) {
    const prrDir = path.join(projectDir, PRR_FOLDER_NAME);

    if (!(await fs.pathExists(prrDir))) {
      return { installed: false, prrDir };
    }

    const manifestPath = path.join(prrDir, '_config', 'manifest.yaml');
    if (!(await fs.pathExists(manifestPath))) {
      return { installed: false, prrDir };
    }

    try {
      const content = await fs.readFile(manifestPath, 'utf8');
      const data = yaml.parse(content);
      const modules = (data.modules || []).map((m) => (typeof m === 'string' ? m : m.name));
      return {
        installed: true,
        version: data.installation?.version || 'unknown',
        installDate: data.installation?.installDate,
        modules,
        ides: data.ides || [],
        prrDir,
      };
    } catch {
      return { installed: false, prrDir };
    }
  }
}

module.exports = { Detector, PRR_FOLDER_NAME };
