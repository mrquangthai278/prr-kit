/**
 * Config-Driven IDE Setup — handles standard IDE installation patterns
 * based on platform-codes.yaml configuration
 */
const path = require('node:path');
const fs = require('fs-extra');
const { BaseIdeSetup } = require('./_base-ide');
const { glob } = require('glob');

class ConfigDrivenIdeSetup extends BaseIdeSetup {
  constructor(platformCode, platformConfig) {
    super(platformCode, platformConfig.name, platformConfig.preferred || false);
    this.platformConfig = platformConfig;
    this.installerConfig = platformConfig.installer || null;
  }

  async setup(projectDir, prrDir, options = {}) {
    if (!this.installerConfig) return { success: false, reason: 'no-config' };

    // Multi-target support (e.g. opencode: agents → one dir, workflows → another)
    if (this.installerConfig.targets) {
      return this._setupMultiTarget(projectDir, prrDir, options);
    }

    await this.cleanup(projectDir, options);

    const { target_dir, template_type } = this.installerConfig;
    const targetPath = path.join(projectDir, target_dir);
    await this.ensureDir(targetPath);

    const results = { agents: 0, workflows: 0 };
    const installedFiles = [];
    const selectedModules = options.selectedModules || ['prr'];
    const allModules = ['core', ...selectedModules.filter((m) => m !== 'core')];

    // Install agent launchers
    for (const mod of allModules) {
      const agentsDir = path.join(prrDir, mod, 'agents');
      if (!(await fs.pathExists(agentsDir))) continue;

      const agentFiles = await glob('**/*.md', { cwd: agentsDir });
      for (const agentFile of agentFiles) {
        const agentPath = path.join(agentsDir, agentFile);
        const agentContent = await fs.readFile(agentPath, 'utf8');

        // Extract name and description from frontmatter
        const nameMatch = agentContent.match(/^name:\s*["']?([^"'\n]+)["']?/m);
        const descMatch = agentContent.match(/^description:\s*["']?([^"'\n]+)["']?/m);

        // Skip agents marked as internal (no-launcher)
        if (/^no-launcher:\s*true/m.test(agentContent)) continue;

        const agentName = nameMatch?.[1]?.trim() || path.basename(agentFile, '.md');
        const agentDesc = descMatch?.[1]?.trim() || `${agentName} reviewer`;
        const relAgentPath = `${mod}/agents/${agentFile}`.replaceAll('\\', '/');

        const launcherContent = this.generateAgentLauncher(agentName, agentDesc, relAgentPath, template_type);
        // Use agent basename directly — e.g. prr-master.md → /prr-master
        const launcherFileName = `${path.basename(agentFile, '.md')}.md`;
        await fs.writeFile(path.join(targetPath, launcherFileName), launcherContent, 'utf8');
        installedFiles.push(launcherFileName);
        results.agents++;
      }
    }

    // Install workflow launchers
    for (const mod of allModules) {
      const workflowsDir = path.join(prrDir, mod, 'workflows');
      if (!(await fs.pathExists(workflowsDir))) continue;

      const workflowFiles = await glob('**/workflow{.md,.yaml}', { cwd: workflowsDir });
      for (const wfFile of workflowFiles) {
        const wfPath = path.join(workflowsDir, wfFile);
        const wfContent = await fs.readFile(wfPath, 'utf8');

        let wfName = path.basename(path.dirname(wfFile));
        let wfDesc = '';

        if (wfFile.endsWith('.yaml')) {
          const yaml = require('yaml');
          try {
            const data = yaml.parse(wfContent);
            wfName = data.name || wfName;
            wfDesc = data.description || '';
          } catch { /* ignore */ }
        } else {
          const normalized = wfContent.replace(/\r\n/g, '\n');
          const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---/);
          if (fmMatch) {
            try {
              const yaml = require('yaml');
              const fm = yaml.parse(fmMatch[1]);
              wfName = fm.name || wfName;
              wfDesc = fm.description || '';
            } catch { /* ignore */ }
          }
        }

        const relWfPath = `${mod}/workflows/${wfFile}`.replaceAll('\\', '/');
        const launcherContent = this.generateWorkflowLauncher(wfName, wfDesc, relWfPath, template_type);

        // Use leaf directory name prefixed with prr- — e.g. prr-select-pr.md → /prr-select-pr
        const dirParts = path.dirname(wfFile).split(path.sep).filter(Boolean);
        const leafDir = dirParts.at(-1) || wfName;
        const launcherFileName = `prr-${leafDir}.md`;
        await fs.writeFile(path.join(targetPath, launcherFileName), launcherContent, 'utf8');
        installedFiles.push(launcherFileName);
        results.workflows++;
      }
    }

    // Write manifest so cleanup knows exactly which files to remove
    await fs.writeFile(
      path.join(targetPath, '.prr-installed.json'),
      JSON.stringify(installedFiles, null, 2),
      'utf8'
    );

    return { success: true, results };
  }

  async _setupMultiTarget(projectDir, prrDir, options = {}) {
    const results = { agents: 0, workflows: 0 };
    const selectedModules = options.selectedModules || ['prr'];
    const allModules = ['core', ...selectedModules.filter((m) => m !== 'core')];

    for (const target of this.installerConfig.targets) {
      const { target_dir, template_type, artifact_types } = target;
      const targetPath = path.join(projectDir, target_dir);
      await this.ensureDir(targetPath);

      const installAgents = !artifact_types || artifact_types.includes('agents');
      const installWorkflows = !artifact_types || artifact_types.includes('workflows');

      if (installAgents) {
        for (const mod of allModules) {
          const agentsDir = path.join(prrDir, mod, 'agents');
          if (!(await fs.pathExists(agentsDir))) continue;
          const agentFiles = await glob('**/*.md', { cwd: agentsDir });
          for (const agentFile of agentFiles) {
            const agentContent = await fs.readFile(path.join(agentsDir, agentFile), 'utf8');
            if (/^no-launcher:\s*true/m.test(agentContent)) continue;
            const nameMatch = agentContent.match(/^name:\s*[\"']?([^\"'\n]+)[\"']?/m);
            const descMatch = agentContent.match(/^description:\s*[\"']?([^\"'\n]+)[\"']?/m);
            const agentName = nameMatch?.[1]?.trim() || path.basename(agentFile, '.md');
            const agentDesc = descMatch?.[1]?.trim() || `${agentName} reviewer`;
            const relAgentPath = `${mod}/agents/${agentFile}`.replaceAll('\\', '/');
            const launcherContent = this.generateAgentLauncher(agentName, agentDesc, relAgentPath, template_type);
            const launcherFileName = `${path.basename(agentFile, '.md')}.md`;
            await fs.writeFile(path.join(targetPath, launcherFileName), launcherContent, 'utf8');
            results.agents++;
          }
        }
      }

      if (installWorkflows) {
        for (const mod of allModules) {
          const workflowsDir = path.join(prrDir, mod, 'workflows');
          if (!(await fs.pathExists(workflowsDir))) continue;
          const workflowFiles = await glob('**/workflow{.md,.yaml}', { cwd: workflowsDir });
          for (const wfFile of workflowFiles) {
            const wfContent = await fs.readFile(path.join(workflowsDir, wfFile), 'utf8');
            let wfName = path.basename(path.dirname(wfFile));
            let wfDesc = '';
            if (wfFile.endsWith('.yaml')) {
              try { const d = require('yaml').parse(wfContent); wfName = d.name || wfName; wfDesc = d.description || ''; } catch { /* ignore */ }
            } else {
              const normalized = wfContent.replace(/\r\n/g, '\n');
              const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---/);
              if (fmMatch) { try { const fm = require('yaml').parse(fmMatch[1]); wfName = fm.name || wfName; wfDesc = fm.description || ''; } catch { /* ignore */ } }
            }
            const dirParts = path.dirname(wfFile).split(path.sep).filter(Boolean);
            const leafDir = dirParts.at(-1) || wfName;
            const relWfPath = `${mod}/workflows/${wfFile}`.replaceAll('\\', '/');
            const launcherContent = this.generateWorkflowLauncher(wfName, wfDesc, relWfPath, template_type);
            const launcherFileName = `prr-${leafDir}.md`;
            await fs.writeFile(path.join(targetPath, launcherFileName), launcherContent, 'utf8');
            results.workflows++;
          }
        }
      }
    }

    return { success: true, results };
  }

  generateAgentLauncher(name, description, agentRelPath, templateType) {
    const template = this.loadTemplate(`${templateType}-agent`) || this.loadTemplate('default-agent');
    return template
      .replaceAll('{{name}}', name)
      .replaceAll('{{description}}', description)
      .replaceAll('{{path}}', agentRelPath)
      .replaceAll('{{prrFolderName}}', this.prrFolderName);
  }

  generateWorkflowLauncher(name, description, wfRelPath, templateType) {
    const template = this.loadTemplate(`${templateType}-workflow`) || this.loadTemplate('default-workflow');
    return template
      .replaceAll('{{name}}', name)
      .replaceAll('{{description}}', description)
      .replaceAll('{{path}}', wfRelPath)
      .replaceAll('{{prrFolderName}}', this.prrFolderName);
  }

  loadTemplate(templateName) {
    const templatePath = path.join(__dirname, 'templates', 'combined', `${templateName}.md`);
    try {
      return require('fs-extra').readFileSync(templatePath, 'utf8');
    } catch {
      return null;
    }
  }

  async cleanup(projectDir, options = {}) {
    if (!this.installerConfig?.target_dir) return;
    const targetPath = path.join(projectDir, this.installerConfig.target_dir);
    if (!(await fs.pathExists(targetPath))) return;

    const manifestPath = path.join(targetPath, '.prr-installed.json');
    if (await fs.pathExists(manifestPath)) {
      // Remove exactly the files recorded during the last install
      const installedFiles = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      for (const file of installedFiles) {
        await fs.remove(path.join(targetPath, file));
      }
      await fs.remove(manifestPath);
    } else {
      // Fallback for installations before manifest tracking was added
      const files = await glob('prr-*.md', { cwd: targetPath });
      for (const file of files) {
        await fs.remove(path.join(targetPath, file));
      }
    }
  }
}

module.exports = { ConfigDrivenIdeSetup };
