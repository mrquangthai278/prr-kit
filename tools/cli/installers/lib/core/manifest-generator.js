/**
 * Manifest Generator — scans installed modules and generates CSV manifests
 */
const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('yaml');
const { glob } = require('glob');

class ManifestGenerator {
  constructor() {
    this.workflows = [];
    this.agents = [];
    this.tasks = [];
    this.prrDir = null;
  }

  async generateManifests(prrDir, selectedModules, options = {}) {
    const cfgDir = path.join(prrDir, '_config');
    await fs.ensureDir(cfgDir);

    this.prrDir = prrDir;

    const allModules = [...new Set(['core', ...selectedModules])];

    await this.collectWorkflows(allModules);
    await this.collectAgents(allModules);
    await this.collectTasks(allModules);

    await this.writeWorkflowManifest(cfgDir);
    await this.writeAgentManifest(cfgDir);
    await this.writeTaskManifest(cfgDir);

    return {
      workflows: this.workflows.length,
      agents: this.agents.length,
      tasks: this.tasks.length,
    };
  }

  async collectWorkflows(modules) {
    this.workflows = [];
    for (const mod of modules) {
      const workflowsPath = path.join(this.prrDir, mod, 'workflows');
      if (!(await fs.pathExists(workflowsPath))) continue;

      const files = await glob('**/workflow{.md,.yaml}', { cwd: workflowsPath });
      for (const file of files) {
        const fullPath = path.join(workflowsPath, file);
        const info = await this.parseWorkflowFile(fullPath, mod, file);
        if (info) this.workflows.push(info);
      }
    }
  }

  async parseWorkflowFile(filePath, moduleName, relPath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      let name = path.basename(path.dirname(relPath));
      let description = '';

      if (filePath.endsWith('.yaml')) {
        const data = yaml.parse(content);
        name = data.name || name;
        description = data.description || '';
      } else {
        // Parse markdown frontmatter
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          try {
            const fm = yaml.parse(match[1]);
            name = fm.name || name;
            description = fm.description || '';
          } catch { /* ignore */ }
        }
      }

      return {
        module: moduleName,
        name,
        description,
        path: path.join('_prr', moduleName, 'workflows', relPath).replaceAll('\\', '/'),
      };
    } catch {
      return null;
    }
  }

  async collectAgents(modules) {
    this.agents = [];
    for (const mod of modules) {
      const agentsPath = path.join(this.prrDir, mod, 'agents');
      if (!(await fs.pathExists(agentsPath))) continue;

      const files = await glob('**/*.md', { cwd: agentsPath });
      for (const file of files) {
        const fullPath = path.join(agentsPath, file);
        const info = await this.parseAgentFile(fullPath, mod, file);
        if (info) this.agents.push(info);
      }
    }
  }

  async parseAgentFile(filePath, moduleName, relPath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      // Extract XML agent attributes
      const nameMatch = content.match(/name="([^"]+)"/);
      const titleMatch = content.match(/title="([^"]+)"/);
      const iconMatch = content.match(/icon="([^"]+)"/);
      const capMatch = content.match(/capabilities="([^"]+)"/);

      return {
        module: moduleName,
        name: nameMatch?.[1] || path.basename(relPath, '.md'),
        title: titleMatch?.[1] || '',
        icon: iconMatch?.[1] || '🔍',
        capabilities: capMatch?.[1] || '',
        path: path.join('_prr', moduleName, 'agents', relPath).replaceAll('\\', '/'),
      };
    } catch {
      return null;
    }
  }

  async collectTasks(modules) {
    this.tasks = [];
    for (const mod of modules) {
      const tasksPath = path.join(this.prrDir, mod, 'tasks');
      if (!(await fs.pathExists(tasksPath))) continue;

      const files = await glob('**/*.{md,xml}', { cwd: tasksPath });
      for (const file of files) {
        this.tasks.push({
          module: mod,
          name: path.basename(file, path.extname(file)),
          path: path.join('_prr', mod, 'tasks', file).replaceAll('\\', '/'),
        });
      }
    }
  }

  cleanForCSV(text) {
    if (!text) return '';
    return text.trim().replaceAll(/\s+/g, ' ').replaceAll('"', '""');
  }

  async writeWorkflowManifest(cfgDir) {
    const rows = ['module,name,description,path'];
    for (const w of this.workflows) {
      rows.push(`"${this.cleanForCSV(w.module)}","${this.cleanForCSV(w.name)}","${this.cleanForCSV(w.description)}","${this.cleanForCSV(w.path)}"`);
    }
    await fs.writeFile(path.join(cfgDir, 'workflow-manifest.csv'), rows.join('\n') + '\n', 'utf8');
  }

  async writeAgentManifest(cfgDir) {
    const rows = ['module,name,title,icon,capabilities,path'];
    for (const a of this.agents) {
      rows.push(`"${this.cleanForCSV(a.module)}","${this.cleanForCSV(a.name)}","${this.cleanForCSV(a.title)}","${this.cleanForCSV(a.icon)}","${this.cleanForCSV(a.capabilities)}","${this.cleanForCSV(a.path)}"`);
    }
    await fs.writeFile(path.join(cfgDir, 'agent-manifest.csv'), rows.join('\n') + '\n', 'utf8');
  }

  async writeTaskManifest(cfgDir) {
    const rows = ['module,name,path'];
    for (const t of this.tasks) {
      rows.push(`"${this.cleanForCSV(t.module)}","${this.cleanForCSV(t.name)}","${this.cleanForCSV(t.path)}"`);
    }
    await fs.writeFile(path.join(cfgDir, 'task-manifest.csv'), rows.join('\n') + '\n', 'utf8');
  }
}

module.exports = { ManifestGenerator };
