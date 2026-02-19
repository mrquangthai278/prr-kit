/**
 * IDE Manager — dynamically loads and manages IDE handlers
 */
const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('yaml');
const { PRR_FOLDER_NAME } = require('./shared/path-utils');

class IdeManager {
  constructor() {
    this.handlers = new Map();
    this._initialized = false;
    this.prrFolderName = PRR_FOLDER_NAME;
  }

  setPrrFolderName(name) {
    this.prrFolderName = name;
    for (const handler of this.handlers.values()) {
      if (typeof handler.setPrrFolderName === 'function') {
        handler.setPrrFolderName(name);
      }
    }
  }

  async ensureInitialized() {
    if (!this._initialized) {
      await this.loadHandlers();
      this._initialized = true;
    }
  }

  async loadHandlers() {
    const platformCodesPath = path.join(__dirname, 'platform-codes.yaml');
    const content = await fs.readFile(platformCodesPath, 'utf8');
    const config = yaml.parse(content);

    const { ConfigDrivenIdeSetup } = require('./_config-driven');

    for (const [code, info] of Object.entries(config.platforms || {})) {
      if (!info.installer) continue;
      const handler = new ConfigDrivenIdeSetup(code, info);
      handler.setPrrFolderName(this.prrFolderName);
      this.handlers.set(code, handler);
    }
  }

  getAvailableIdes() {
    const ides = [];
    for (const [key, handler] of this.handlers) {
      ides.push({
        value: key,
        name: handler.displayName || handler.name || key,
        preferred: handler.preferred || false,
      });
    }
    return ides.sort((a, b) => {
      if (a.preferred && !b.preferred) return -1;
      if (!a.preferred && b.preferred) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  getPreferredIdes() {
    return this.getAvailableIdes().filter((i) => i.preferred);
  }

  async setup(ideName, projectDir, prrDir, options = {}) {
    await this.ensureInitialized();
    const handler = this.handlers.get(ideName.toLowerCase());
    if (!handler) return { success: false, ide: ideName, error: 'unsupported IDE' };

    try {
      const result = await handler.setup(projectDir, prrDir, options);
      let detail = '';
      if (result && result.results) {
        const parts = [];
        if (result.results.agents > 0) parts.push(`${result.results.agents} agents`);
        if (result.results.workflows > 0) parts.push(`${result.results.workflows} workflows`);
        detail = parts.join(', ');
      }
      return { success: true, ide: ideName, detail };
    } catch (error) {
      return { success: false, ide: ideName, error: error.message };
    }
  }

  async cleanup(projectDir, options = {}) {
    await this.ensureInitialized();
    for (const handler of this.handlers.values()) {
      try {
        await handler.cleanup(projectDir, options);
      } catch { /* ignore */ }
    }
  }
}

module.exports = { IdeManager };
