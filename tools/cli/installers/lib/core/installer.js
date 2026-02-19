/**
 * Installer — main installation orchestrator
 * Main installation orchestrator for PR Review Framework
 */
const path = require('node:path');
const fs = require('fs-extra');
const { Manifest } = require('./manifest');
const { ManifestGenerator } = require('./manifest-generator');
const { ConfigCollector } = require('./config-collector');
const { Detector, PRR_FOLDER_NAME } = require('./detector');
const { IdeManager } = require('../ide/manager');
const { compileAgent } = require('../../../lib/agent/compiler');
const prompts = require('../../../lib/prompts');
const packageJson = require('../../../../../package.json');

const SRC_DIR = path.join(__dirname, '..', '..', '..', '..', '..', 'src');
const TEXT_EXTENSIONS = new Set(['.md', '.yaml', '.yml', '.txt', '.json', '.js', '.csv', '.xml', '.toml']);

class Installer {
  constructor() {
    this.manifest = new Manifest();
    this.manifestGenerator = new ManifestGenerator();
    this.configCollector = new ConfigCollector();
    this.detector = new Detector();
    this.ideManager = new IdeManager();
  }

  async install(config) {
    const { projectDir, selectedModules = ['prr'], selectedIdes = [], actionType = 'install' } = config;

    await this.ideManager.ensureInitialized();

    const prrDir = path.join(projectDir, PRR_FOLDER_NAME);
    await fs.ensureDir(prrDir);

    await prompts.log.step(`Installing PR Review to ${projectDir}...`);

    // Copy module files from src/
    const modulesToInstall = ['core', ...selectedModules.filter((m) => m !== 'core')];
    for (const mod of modulesToInstall) {
      const srcModDir = path.join(SRC_DIR, mod === 'core' ? 'core' : mod);
      const dstModDir = path.join(prrDir, mod);

      if (!(await fs.pathExists(srcModDir))) {
        await prompts.log.warn(`Module '${mod}' not found in src/ — skipping`);
        continue;
      }

      await fs.remove(dstModDir);
      await this.copyModuleFiles(srcModDir, dstModDir);
      await prompts.log.info(`  ✓ Module '${mod}' installed`);
    }

    // Compile agents (YAML → XML/MD)
    await this.compileModuleAgents(prrDir, modulesToInstall);

    // Write config files
    await this.configCollector.writeConfigs(prrDir, config);
    await prompts.log.info('  ✓ Configuration written');

    // Create output directories
    const outputFolderAbs = path.join(projectDir, config.outputFolder || '_prr-output');
    await fs.ensureDir(path.join(outputFolderAbs, 'reviews'));
    await prompts.log.info('  ✓ Output directories created');

    // Generate manifests
    const cfgDir = path.join(prrDir, '_config');
    await fs.ensureDir(cfgDir);
    await this.manifestGenerator.generateManifests(prrDir, selectedModules);
    await this.manifest.create(prrDir, {
      version: packageJson.version,
      modules: modulesToInstall,
      ides: selectedIdes,
    });
    await prompts.log.info('  ✓ Manifests generated');

    // Configure IDEs
    for (const ide of selectedIdes) {
      const result = await this.ideManager.setup(ide, projectDir, prrDir, { selectedModules: modulesToInstall });
      if (result.success) {
        await prompts.log.info(`  ✓ ${ide} configured (${result.detail || 'done'})`);
      }
    }

    await prompts.log.success('PR Review installed successfully!');
    await prompts.log.info('Open your AI IDE and use the reviewer agents to start reviewing PRs.');

    return { success: true };
  }

  async copyModuleFiles(srcDir, dstDir) {
    await fs.ensureDir(dstDir);
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const dstPath = path.join(dstDir, entry.name);

      if (entry.isDirectory()) {
        await this.copyModuleFiles(srcPath, dstPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (TEXT_EXTENSIONS.has(ext)) {
          const content = await fs.readFile(srcPath, 'utf8');
          await fs.ensureDir(path.dirname(dstPath));
          await fs.writeFile(dstPath, content, 'utf8');
        } else {
          await fs.copy(srcPath, dstPath, { overwrite: true });
        }
      }
    }
  }

  async compileModuleAgents(prrDir, modules) {
    for (const mod of modules) {
      const agentsYamlDir = path.join(prrDir, mod, 'agents');
      if (!(await fs.pathExists(agentsYamlDir))) continue;

      const files = await fs.readdir(agentsYamlDir);
      for (const file of files) {
        if (!file.endsWith('.agent.yaml')) continue;

        const yamlPath = path.join(agentsYamlDir, file);
        const baseName = file.replace('.agent.yaml', '');
        const outputPath = path.join(agentsYamlDir, `${baseName}.md`);

        try {
          const yamlContent = await fs.readFile(yamlPath, 'utf8');
          const { xml } = await compileAgent(yamlContent, {}, baseName, `_prr/${mod}/agents/${baseName}.md`);
          await fs.writeFile(outputPath, xml, 'utf8');
        } catch (err) {
          await prompts.log.warn(`  Warning: Could not compile agent ${file}: ${err.message}`);
        }
      }
    }
  }

  async uninstall(projectDir) {
    const prrDir = path.join(projectDir, PRR_FOLDER_NAME);
    if (await fs.pathExists(prrDir)) {
      await fs.remove(prrDir);
    }
    // Also clean IDE configurations
    await this.ideManager.ensureInitialized();
    await this.ideManager.cleanup(projectDir);
  }

  async quickUpdate(config) {
    const { projectDir } = config;
    const existing = await this.detector.detect(projectDir);
    if (!existing.installed) {
      throw new Error('PR Review is not installed in this directory.');
    }
    return this.install({ ...config, selectedModules: existing.modules, selectedIdes: existing.ides });
  }

  async status(projectDir) {
    return this.detector.detect(projectDir);
  }
}

module.exports = { Installer };
