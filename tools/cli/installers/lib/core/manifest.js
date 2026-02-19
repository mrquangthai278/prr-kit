/**
 * Manifest — read/write installation manifest.yaml
 */
const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('yaml');

const packageJson = require('../../../../../package.json');

class Manifest {
  async create(prrDir, data) {
    const manifestPath = path.join(prrDir, '_config', 'manifest.yaml');
    await fs.ensureDir(path.dirname(manifestPath));

    const version = data.version || packageJson.version;
    const now = data.installDate || new Date().toISOString();

    const moduleDetails = (data.modules || []).map((name) => ({
      name,
      version,
      installDate: now,
      lastUpdated: now,
      source: 'built-in',
    }));

    const manifestData = {
      installation: {
        version,
        installDate: now,
        lastUpdated: now,
      },
      modules: moduleDetails,
      ides: data.ides || [],
    };

    const content = yaml.stringify(manifestData, { indent: 2, lineWidth: 0 });
    await fs.writeFile(manifestPath, content, 'utf8');
    return { success: true, path: manifestPath };
  }

  async read(prrDir) {
    const manifestPath = path.join(prrDir, '_config', 'manifest.yaml');
    if (!(await fs.pathExists(manifestPath))) return null;

    try {
      const content = await fs.readFile(manifestPath, 'utf8');
      const data = yaml.parse(content);
      const modules = (data.modules || []).map((m) => (typeof m === 'string' ? m : m.name));
      return {
        version: data.installation?.version,
        installDate: data.installation?.installDate,
        lastUpdated: data.installation?.lastUpdated,
        modules,
        ides: data.ides || [],
      };
    } catch {
      return null;
    }
  }
}

module.exports = { Manifest };
