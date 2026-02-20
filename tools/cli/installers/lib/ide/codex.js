/**
 * Codex CLI setup handler
 * Installs prompts to ~/.codex/prompts (global) or .codex/prompts (project)
 */
const path = require('node:path');
const os = require('node:os');
const { BaseIdeSetup } = require('./_base-ide');
const fs = require('fs-extra');
const { glob } = require('glob');
const yaml = require('yaml');

class CodexSetup extends BaseIdeSetup {
  constructor() {
    super('codex', 'Codex', false);
  }

  async setup(projectDir, prrDir, options = {}) {
    const installLocation = options.preCollectedConfig?.installLocation || 'global';
    const destDir = this._getPromptDir(projectDir, installLocation);
    await fs.ensureDir(destDir);
    await this._clearPrrFiles(destDir);

    const selectedModules = options.selectedModules || ['prr'];
    const allModules = ['core', ...selectedModules.filter((m) => m !== 'core')];
    let count = 0;

    // Write agent launchers
    for (const mod of allModules) {
      const agentsSrcDir = path.join(prrDir, mod, 'agents');
      if (!(await fs.pathExists(agentsSrcDir))) continue;

      const agentFiles = await glob('**/*.md', { cwd: agentsSrcDir });
      for (const agentFile of agentFiles) {
        const agentContent = await fs.readFile(path.join(agentsSrcDir, agentFile), 'utf8');
        if (/^no-launcher:\s*true/m.test(agentContent)) continue;

        const nameMatch = agentContent.match(/^name:\s*[\"']?([^\"'\n]+)[\"']?/m);
        const agentName = nameMatch?.[1]?.trim() || path.basename(agentFile, '.md');
        const relPath = `${this.prrFolderName}/${mod}/agents/${agentFile}`.replaceAll('\\', '/');

        const content = `---
name: '${agentName}'
description: '${agentName} agent'
disable-model-invocation: true
---

You must fully embody this agent's persona and follow all activation instructions exactly as specified. NEVER break character until given an exit command.

<agent-activation CRITICAL="TRUE">
1. LOAD the FULL agent file from {project-root}/${relPath}
2. READ its entire contents - this contains the complete agent persona, menu, and instructions
3. FOLLOW every step in the <activation> section precisely
4. DISPLAY the welcome/greeting as instructed
5. PRESENT the numbered menu
6. WAIT for user input before proceeding
</agent-activation>
`;
        const fileName = `prr-${mod}-${path.basename(agentFile, '.md')}.md`;
        await fs.writeFile(path.join(destDir, fileName), content, 'utf8');
        count++;
      }
    }

    // Write workflow launchers
    for (const mod of allModules) {
      const workflowsSrcDir = path.join(prrDir, mod, 'workflows');
      if (!(await fs.pathExists(workflowsSrcDir))) continue;

      const workflowFiles = await glob('**/workflow{.md,.yaml}', { cwd: workflowsSrcDir });
      for (const wfFile of workflowFiles) {
        const wfContent = await fs.readFile(path.join(workflowsSrcDir, wfFile), 'utf8');
        let wfName = path.basename(path.dirname(wfFile));

        if (wfFile.endsWith('.yaml')) {
          try { const d = yaml.parse(wfContent); wfName = d.name || wfName; } catch { /* ignore */ }
        } else {
          const normalized = wfContent.replace(/\r\n/g, '\n');
          const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---/);
          if (fmMatch) { try { const fm = yaml.parse(fmMatch[1]); wfName = fm.name || wfName; } catch { /* ignore */ } }
        }

        const dirParts = path.dirname(wfFile).split(path.sep).filter(Boolean);
        const leafDir = dirParts.at(-1) || wfName;
        const relPath = `${this.prrFolderName}/${mod}/workflows/${wfFile}`.replaceAll('\\', '/');

        const content = `---
name: 'prr-${leafDir}'
description: '${wfName}'
disable-model-invocation: true
---

IT IS CRITICAL THAT YOU FOLLOW THIS COMMAND: LOAD the FULL @{project-root}/${relPath}, READ its entire contents and follow its directions exactly!
`;
        const fileName = `prr-${mod}-${leafDir}.md`;
        await fs.writeFile(path.join(destDir, fileName), content, 'utf8');
        count++;
      }
    }

    return { success: true, results: { agents: count, workflows: 0 } };
  }

  async cleanup(projectDir) {
    for (const loc of ['global', 'project']) {
      const dir = this._getPromptDir(projectDir, loc);
      await this._clearPrrFiles(dir);
    }
  }

  _getPromptDir(projectDir, location) {
    if (location === 'project' && projectDir) {
      return path.join(projectDir, '.codex', 'prompts');
    }
    return path.join(os.homedir(), '.codex', 'prompts');
  }

  async _clearPrrFiles(dir) {
    if (!(await fs.pathExists(dir))) return;
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      if (entry.startsWith('prr-') && entry.endsWith('.md')) {
        await fs.remove(path.join(dir, entry));
      }
    }
  }
}

module.exports = { CodexSetup };
