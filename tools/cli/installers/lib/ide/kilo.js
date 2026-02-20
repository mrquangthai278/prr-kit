/**
 * KiloCoder IDE setup handler
 * Creates custom modes in .kilocodemodes + workflow files in .kilocode/workflows/
 */
const path = require('node:path');
const { BaseIdeSetup } = require('./_base-ide');
const fs = require('fs-extra');
const { glob } = require('glob');
const yaml = require('yaml');

class KiloSetup extends BaseIdeSetup {
  constructor() {
    super('kilo', 'KiloCoder', false);
    this.configFile = '.kilocodemodes';
  }

  async setup(projectDir, prrDir, options = {}) {
    await this.cleanup(projectDir);

    const kiloModesPath = path.join(projectDir, this.configFile);
    let config = {};
    if (await fs.pathExists(kiloModesPath)) {
      try { config = yaml.parse(await fs.readFile(kiloModesPath, 'utf8')) || {}; } catch { config = {}; }
    }
    if (!Array.isArray(config.customModes)) config.customModes = [];

    const selectedModules = options.selectedModules || ['prr'];
    const allModules = ['core', ...selectedModules.filter((m) => m !== 'core')];
    let modeCount = 0;

    // Add custom modes from agents
    for (const mod of allModules) {
      const agentsSrcDir = path.join(prrDir, mod, 'agents');
      if (!(await fs.pathExists(agentsSrcDir))) continue;

      const agentFiles = await glob('**/*.md', { cwd: agentsSrcDir });
      for (const agentFile of agentFiles) {
        const agentContent = await fs.readFile(path.join(agentsSrcDir, agentFile), 'utf8');
        if (/^no-launcher:\s*true/m.test(agentContent)) continue;

        const nameMatch = agentContent.match(/^name:\s*[\"']?([^\"'\n]+)[\"']?/m);
        const descMatch = agentContent.match(/^description:\s*[\"']?([^\"'\n]+)[\"']?/m);
        const agentName = nameMatch?.[1]?.trim() || path.basename(agentFile, '.md');
        const agentDesc = descMatch?.[1]?.trim() || `${agentName} reviewer`;
        const relPath = `${this.prrFolderName}/${mod}/agents/${agentFile}`.replaceAll('\\', '/');
        const slug = `prr-${mod}-${path.basename(agentFile, '.md')}`;

        config.customModes.push({
          slug,
          name: agentName,
          roleDefinition: agentDesc,
          whenToUse: `Use for ${agentName} tasks`,
          customInstructions: `Read the full agent file from {project-root}/${relPath} and follow all activation instructions exactly.\n`,
          groups: ['read', 'edit', 'browser', 'command', 'mcp'],
        });
        modeCount++;
      }
    }

    await fs.writeFile(kiloModesPath, yaml.stringify(config, { lineWidth: 0 }), 'utf8');

    // Write workflow files to .kilocode/workflows/
    const workflowsDir = path.join(projectDir, '.kilocode', 'workflows');
    await this.ensureDir(workflowsDir);
    let wfCount = 0;

    for (const mod of allModules) {
      const workflowsSrcDir = path.join(prrDir, mod, 'workflows');
      if (!(await fs.pathExists(workflowsSrcDir))) continue;

      const workflowFiles = await glob('**/workflow{.md,.yaml}', { cwd: workflowsSrcDir });
      for (const wfFile of workflowFiles) {
        const wfContent = await fs.readFile(path.join(workflowsSrcDir, wfFile), 'utf8');
        let wfName = path.basename(path.dirname(wfFile));
        let wfDesc = '';

        if (wfFile.endsWith('.yaml')) {
          try { const d = yaml.parse(wfContent); wfName = d.name || wfName; wfDesc = d.description || ''; } catch { /* ignore */ }
        } else {
          const normalized = wfContent.replace(/\r\n/g, '\n');
          const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---/);
          if (fmMatch) { try { const fm = yaml.parse(fmMatch[1]); wfName = fm.name || wfName; wfDesc = fm.description || ''; } catch { /* ignore */ } }
        }

        const dirParts = path.dirname(wfFile).split(path.sep).filter(Boolean);
        const leafDir = dirParts.at(-1) || wfName;
        const relPath = `${this.prrFolderName}/${mod}/workflows/${wfFile}`.replaceAll('\\', '/');

        const content = `---
name: 'prr-${leafDir}'
description: '${wfDesc || wfName}'
disable-model-invocation: true
---

IT IS CRITICAL THAT YOU FOLLOW THIS COMMAND: LOAD the FULL @{project-root}/${relPath}, READ its entire contents and follow its directions exactly!
`;
        const fileName = `prr-${leafDir}.md`;
        await fs.writeFile(path.join(workflowsDir, fileName), content, 'utf8');
        wfCount++;
      }
    }

    return { success: true, results: { agents: modeCount, workflows: wfCount } };
  }

  async cleanup(projectDir) {
    // Remove prr- modes from .kilocodemodes
    const kiloModesPath = path.join(projectDir, this.configFile);
    if (await fs.pathExists(kiloModesPath)) {
      try {
        const config = yaml.parse(await fs.readFile(kiloModesPath, 'utf8')) || {};
        if (Array.isArray(config.customModes)) {
          config.customModes = config.customModes.filter((m) => !m.slug?.startsWith('prr-'));
          await fs.writeFile(kiloModesPath, yaml.stringify(config, { lineWidth: 0 }), 'utf8');
        }
      } catch { /* ignore */ }
    }

    // Remove prr- workflow files
    const workflowsDir = path.join(projectDir, '.kilocode', 'workflows');
    if (await fs.pathExists(workflowsDir)) {
      const files = await fs.readdir(workflowsDir);
      for (const file of files) {
        if (file.startsWith('prr-') && file.endsWith('.md')) {
          await fs.remove(path.join(workflowsDir, file));
        }
      }
    }
  }
}

module.exports = { KiloSetup };
