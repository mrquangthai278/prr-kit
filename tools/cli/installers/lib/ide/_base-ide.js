/**
 * Base IDE Setup — abstract class for IDE handlers
 */
const fs = require('fs-extra');
const { PRR_FOLDER_NAME } = require('./shared/path-utils');

class BaseIdeSetup {
  constructor(name, displayName, preferred = false) {
    this.name = name;
    this.displayName = displayName;
    this.preferred = preferred;
    this.prrFolderName = PRR_FOLDER_NAME;
  }

  setPrrFolderName(name) {
    this.prrFolderName = name;
  }

  async ensureDir(dirPath) {
    await fs.ensureDir(dirPath);
  }

  async setup(projectDir, prrDir, options = {}) {
    throw new Error(`setup() not implemented for IDE: ${this.name}`);
  }

  async cleanup(projectDir, options = {}) {
    // Default: no-op; subclasses override to remove IDE-specific files
  }

  async detect(projectDir) {
    return false;
  }
}

module.exports = { BaseIdeSetup };
