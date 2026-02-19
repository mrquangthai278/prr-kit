/**
 * Agent Compiler — transforms agent YAML to compiled XML/Markdown format
 * Compiles agent YAML files to XML/Markdown launcher format
 */

const yaml = require('yaml');
const { processAgentYaml, extractInstallConfig, stripInstallConfig, getDefaultValues } = require('./template-engine');
const { escapeXml } = require('../xml-utils');

function buildFrontmatter(metadata, agentName) {
  const name = agentName || metadata.name || 'agent';
  const description = metadata.title || 'PR Review Agent';
  const noLauncher = metadata.no_launcher ? '\nno-launcher: true' : '';
  return `---\nname: "${name.replaceAll('-', ' ')}"\ndescription: "${description}"${noLauncher}\n---\n\nYou must fully embody this agent's persona and follow all activation instructions exactly as specified. NEVER break character until given an exit command.\n\n`;
}

function buildPersonaXml(persona) {
  if (!persona) return '';
  let xml = '  <persona>\n';
  if (persona.role) xml += `    <role>${escapeXml(persona.role.trim().replaceAll(/\s+/g, ' '))}</role>\n`;
  if (persona.identity) xml += `    <identity>${escapeXml(persona.identity.trim().replaceAll(/\s+/g, ' '))}</identity>\n`;
  if (persona.communication_style) xml += `    <communication_style>${escapeXml(persona.communication_style.trim().replaceAll(/\s+/g, ' '))}</communication_style>\n`;
  if (persona.principles) {
    const text = Array.isArray(persona.principles)
      ? persona.principles.join(' ')
      : persona.principles.trim().replaceAll(/\n+/g, ' ');
    xml += `    <principles>${escapeXml(text)}</principles>\n`;
  }
  xml += '  </persona>\n';
  return xml;
}

function buildMemoriesXml(memories) {
  if (!memories || memories.length === 0) return '';
  let xml = '  <memories>\n';
  for (const m of memories) xml += `    <memory>${escapeXml(String(m))}</memory>\n`;
  xml += '  </memories>\n';
  return xml;
}

function buildMenuXml(menuItems) {
  let xml = '  <menu>\n';
  xml += `    <item cmd="MH or fuzzy match on menu or help">[MH] Redisplay Menu Help</item>\n`;
  xml += `    <item cmd="CH or fuzzy match on chat">[CH] Chat with the Reviewer about anything</item>\n`;

  if (menuItems && menuItems.length > 0) {
    for (const item of menuItems) {
      if (!item.trigger) continue;
      const attrs = [`cmd="${item.trigger}"`];
      if (item.workflow) attrs.push(`workflow="${item.workflow}"`);
      if (item.exec) attrs.push(`exec="${item.exec}"`);
      if (item.action) attrs.push(`action="${item.action}"`);
      xml += `    <item ${attrs.join(' ')}>${escapeXml(item.description || '')}</item>\n`;
    }
  }

  xml += `    <item cmd="PM or fuzzy match on party-mode" exec="{project-root}/_prr/core/workflows/party-mode/workflow.md">[PM] Start Party Mode (multi-reviewer discussion)</item>\n`;
  xml += `    <item cmd="DA or fuzzy match on exit, leave, goodbye or dismiss agent">[DA] Dismiss Reviewer</item>\n`;
  xml += '  </menu>\n';
  return xml;
}

function buildActivationXml(meta) {
  return `  <activation>
    <step>Greet the user by name if known, introduce yourself as ${meta.name || 'PR Reviewer'} (${meta.title || 'Code Reviewer'})</step>
    <step>Display your menu using numbered list format</step>
    <step>Wait for user to select an option</step>
    <step>Load and execute the corresponding workflow or task</step>
  </activation>\n`;
}

async function compileToXml(agentYaml, agentName = '') {
  const agent = agentYaml.agent;
  const meta = agent.metadata;

  let xml = buildFrontmatter(meta, agentName || meta.name);
  xml += '```xml\n';

  const agentAttrs = [
    `id="${meta.id || ''}"`,
    `name="${meta.name || ''}"`,
    `title="${meta.title || ''}"`,
    `icon="${meta.icon || '🔍'}"`,
  ];
  if (meta.capabilities) agentAttrs.push(`capabilities="${escapeXml(meta.capabilities)}"`);

  xml += `<agent ${agentAttrs.join(' ')}>\n`;
  xml += buildActivationXml(meta);

  if (agent.critical_actions && agent.critical_actions.length > 0) {
    xml += '  <critical_actions>\n';
    for (const action of agent.critical_actions) {
      xml += `    <action>${escapeXml(action)}</action>\n`;
    }
    xml += '  </critical_actions>\n';
  }

  xml += buildPersonaXml(agent.persona);
  if (agent.memories && agent.memories.length > 0) xml += buildMemoriesXml(agent.memories);
  xml += buildMenuXml(agent.menu || []);
  xml += '</agent>\n```\n';

  return xml;
}

async function compileAgent(yamlContent, answers = {}, agentName = '', targetPath = '') {
  let agentYaml = yaml.parse(yamlContent);

  const installConfig = extractInstallConfig(agentYaml);
  let finalAnswers = answers;
  if (installConfig) {
    const defaults = getDefaultValues(installConfig);
    finalAnswers = { ...defaults, ...answers };
  }

  const processedYaml = processAgentYaml(agentYaml, finalAnswers);
  const cleanYaml = stripInstallConfig(processedYaml);
  const xml = await compileToXml(cleanYaml, agentName, targetPath);

  return { xml, metadata: cleanYaml.agent.metadata, processedYaml: cleanYaml };
}

module.exports = { compileAgent, compileToXml, buildFrontmatter, buildPersonaXml, buildMenuXml, escapeXml };
