/**
 * GitHub Copilot setup handler
 * Creates agents in .github/agents/, prompts in .github/prompts/,
 * and generates copilot-instructions.md
 */
const path = require('node:path');
const { BaseIdeSetup } = require('./_base-ide');
const fs = require('fs-extra');
const { glob } = require('glob');
const yaml = require('yaml');

class GitHubCopilotSetup extends BaseIdeSetup {
  constructor() {
    super('github-copilot', 'GitHub Copilot', false);
    this.configDir = null;
    this.githubDir = '.github';
    this.agentsDir = 'agents';
    this.promptsDir = 'prompts';
    this.detectionPaths = ['.github/copilot-instructions.md', '.github/agents'];
  }

  async setup(projectDir, prrDir, options = {}) {
    const githubDir = path.join(projectDir, this.githubDir);
    const agentsDir = path.join(githubDir, this.agentsDir);
    const promptsDir = path.join(githubDir, this.promptsDir);
    await this.ensureDir(agentsDir);
    await this.ensureDir(promptsDir);

    await this.cleanup(projectDir);

    const selectedModules = options.selectedModules || ['prr'];
    const allModules = ['core', ...selectedModules.filter((m) => m !== 'core')];

    let agentCount = 0;
    let promptCount = 0;

    // Install agent files to .github/agents/
    for (const mod of allModules) {
      const agentsSrcDir = path.join(prrDir, mod, 'agents');
      if (!(await fs.pathExists(agentsSrcDir))) continue;

      const agentFiles = await glob('**/*.md', { cwd: agentsSrcDir });
      for (const agentFile of agentFiles) {
        const agentPath = path.join(agentsSrcDir, agentFile);
        const agentContent = await fs.readFile(agentPath, 'utf8');

        if (/^no-launcher:\s*true/m.test(agentContent)) continue;

        const nameMatch = agentContent.match(/^name:\s*[\"']?([^\"'\n]+)[\"']?/m);
        const descMatch = agentContent.match(/^description:\s*[\"']?([^\"'\n]+)[\"']?/m);
        const agentName = nameMatch?.[1]?.trim() || path.basename(agentFile, '.md');
        const agentDesc = descMatch?.[1]?.trim() || `${agentName} reviewer`;
        const relAgentPath = `${this.prrFolderName}/${mod}/agents/${agentFile}`.replaceAll('\\', '/');

        const content = this._agentFileContent(agentName, agentDesc, relAgentPath);
        const fileName = `prr-${path.basename(agentFile, '.md')}.agent.md`;
        await fs.writeFile(path.join(agentsDir, fileName), content, 'utf8');
        agentCount++;
      }
    }

    // Install workflow prompts to .github/prompts/
    for (const mod of allModules) {
      const workflowsSrcDir = path.join(prrDir, mod, 'workflows');
      if (!(await fs.pathExists(workflowsSrcDir))) continue;

      const workflowFiles = await glob('**/workflow{.md,.yaml}', { cwd: workflowsSrcDir });
      for (const wfFile of workflowFiles) {
        const wfPath = path.join(workflowsSrcDir, wfFile);
        const wfContent = await fs.readFile(wfPath, 'utf8');

        let wfName = path.basename(path.dirname(wfFile));
        let wfDesc = '';

        if (wfFile.endsWith('.yaml')) {
          try { const d = yaml.parse(wfContent); wfName = d.name || wfName; wfDesc = d.description || ''; } catch { /* ignore */ }
        } else {
          const normalized = wfContent.replace(/\r\n/g, '\n');
          const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---/);
          if (fmMatch) {
            try { const fm = yaml.parse(fmMatch[1]); wfName = fm.name || wfName; wfDesc = fm.description || ''; } catch { /* ignore */ }
          }
        }

        const dirParts = path.dirname(wfFile).split(path.sep).filter(Boolean);
        const leafDir = dirParts.at(-1) || wfName;
        const relWfPath = `${this.prrFolderName}/${mod}/workflows/${wfFile}`.replaceAll('\\', '/');
        const isYaml = wfFile.endsWith('.yaml');

        const content = this._workflowPromptContent(wfName, wfDesc, relWfPath, isYaml);
        const fileName = `prr-${leafDir}.prompt.md`;
        await fs.writeFile(path.join(promptsDir, fileName), content, 'utf8');
        promptCount++;
      }
    }

    // Generate copilot-instructions.md
    await this._generateCopilotInstructions(projectDir, prrDir, options);

    return { success: true, results: { agents: agentCount, workflows: promptCount } };
  }

  _agentFileContent(name, description, agentPath) {
    return `---
description: '${description.replaceAll("'", "''")}'
tools: ['read', 'edit', 'search', 'execute']
disable-model-invocation: true
---

You must fully embody this agent's persona and follow all activation instructions exactly as specified.

<agent-activation CRITICAL="TRUE">
1. LOAD the FULL agent file from {project-root}/${agentPath}
2. READ its entire contents - this contains the complete agent persona, menu, and instructions
3. FOLLOW every step in the <activation> section precisely
4. DISPLAY the welcome/greeting as instructed
5. PRESENT the numbered menu
6. WAIT for user input before proceeding
</agent-activation>
`;
  }

  _workflowPromptContent(name, description, wfPath, isYaml) {
    const safeDesc = (description || name).replaceAll("'", "''");
    let body;
    if (isYaml) {
      body = `1. Load {project-root}/${this.prrFolderName}/prr/config.yaml and store ALL fields as session variables
2. Load the workflow engine at {project-root}/${this.prrFolderName}/core/tasks/workflow.xml
3. Load and execute the workflow at {project-root}/${wfPath} using the engine from step 2`;
    } else {
      body = `1. Load {project-root}/${this.prrFolderName}/prr/config.yaml and store ALL fields as session variables
2. Load and follow the workflow at {project-root}/${wfPath}`;
    }

    return `---
description: '${safeDesc}'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---

${body}
`;
  }

  async _generateCopilotInstructions(projectDir, prrDir, options = {}) {
    const configPath = path.join(prrDir, 'prr', 'config.yaml');
    let config = {};
    if (await fs.pathExists(configPath)) {
      try { config = yaml.parse(await fs.readFile(configPath, 'utf8')) || {}; } catch { /* ignore */ }
    }

    const prr = this.prrFolderName;
    const section = `# PR Review Kit — Project Instructions

## Project Configuration

- **User**: ${config.user_name || 'Dev'}
- **Communication Language**: ${config.communication_language || 'English'}
- **Target Repo**: ${config.target_repo || '.'}
- **Output Folder**: ${config.output_folder || '_prr-output'}
- **Review Output**: ${config.review_output || '_prr-output/reviews'}

## PRR Runtime Structure

- **Agent definitions**: \`${prr}/core/agents/\` and \`${prr}/prr/agents/\`
- **Workflow definitions**: \`${prr}/prr/workflows/\` (organized by phase)
- **Core tasks**: \`${prr}/core/tasks/\`
- **Module configuration**: \`${prr}/prr/config.yaml\`

## Key Conventions

- Always load \`${prr}/prr/config.yaml\` before any agent activation or workflow execution
- MD-based workflows execute directly — load and follow the \`.md\` file
- YAML-based workflows require the workflow engine — load \`core/tasks/workflow.xml\` first
- The \`{project-root}\` variable resolves to the workspace root at runtime

## Available Agents

| Agent | Slash Command | Speciality |
|-------|--------------|------------|
| PRR Master | \`/prr-master\` | Orchestrator — routes all workflows |
| PRR Quick | \`/prr-quick\` | One-command full pipeline |

## Slash Commands

Use \`#prr-\` in Copilot Chat to access PR Review prompts, or select agents from the agents dropdown.`;

    const instructionsPath = path.join(projectDir, this.githubDir, 'copilot-instructions.md');
    const markerStart = '<!-- PRR:START -->';
    const markerEnd = '<!-- PRR:END -->';
    const markedContent = `${markerStart}\n${section}\n${markerEnd}`;

    if (await fs.pathExists(instructionsPath)) {
      const existing = await fs.readFile(instructionsPath, 'utf8');
      const startIdx = existing.indexOf(markerStart);
      const endIdx = existing.indexOf(markerEnd);

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const merged = existing.slice(0, startIdx) + markedContent + existing.slice(endIdx + markerEnd.length);
        await fs.writeFile(instructionsPath, merged, 'utf8');
      } else {
        const backupPath = `${instructionsPath}.bak`;
        await fs.copy(instructionsPath, backupPath);
        await fs.writeFile(instructionsPath, `${markedContent}\n`, 'utf8');
      }
    } else {
      await fs.writeFile(instructionsPath, `${markedContent}\n`, 'utf8');
    }
  }

  async cleanup(projectDir, options = {}) {
    // Clean agents
    const agentsDir = path.join(projectDir, this.githubDir, this.agentsDir);
    if (await fs.pathExists(agentsDir)) {
      const files = await fs.readdir(agentsDir);
      for (const file of files) {
        if (file.startsWith('prr-') && file.endsWith('.agent.md')) {
          await fs.remove(path.join(agentsDir, file));
        }
      }
    }

    // Clean prompts
    const promptsDir = path.join(projectDir, this.githubDir, this.promptsDir);
    if (await fs.pathExists(promptsDir)) {
      const files = await fs.readdir(promptsDir);
      for (const file of files) {
        if (file.startsWith('prr-') && file.endsWith('.prompt.md')) {
          await fs.remove(path.join(promptsDir, file));
        }
      }
    }

    // On uninstall, strip PRR markers from copilot-instructions.md
    if (options.isUninstall) {
      await this._cleanupCopilotInstructions(projectDir);
    }
  }

  async _cleanupCopilotInstructions(projectDir) {
    const instructionsPath = path.join(projectDir, this.githubDir, 'copilot-instructions.md');
    if (!(await fs.pathExists(instructionsPath))) return;

    const content = await fs.readFile(instructionsPath, 'utf8');
    const markerStart = '<!-- PRR:START -->';
    const markerEnd = '<!-- PRR:END -->';
    const startIdx = content.indexOf(markerStart);
    const endIdx = content.indexOf(markerEnd);
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return;

    const cleaned = content.slice(0, startIdx) + content.slice(endIdx + markerEnd.length);
    if (cleaned.trim().length === 0) {
      await fs.remove(instructionsPath);
      const backupPath = `${instructionsPath}.bak`;
      if (await fs.pathExists(backupPath)) await fs.rename(backupPath, instructionsPath);
    } else {
      await fs.writeFile(instructionsPath, cleaned, 'utf8');
    }
  }
}

module.exports = { GitHubCopilotSetup };
