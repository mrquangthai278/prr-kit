#!/usr/bin/env node
/**
 * Test: Agent YAML Schema Validation
 * Validates all .agent.yaml files against the expected schema
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const SRC_DIR = path.join(__dirname, '..', 'src');
let passed = 0;
let failed = 0;

function fail(msg) {
  console.error(`  ❌ ${msg}`);
  failed++;
}

function pass(msg) {
  console.log(`  ✅ ${msg}`);
  passed++;
}

function validateAgent(filePath) {
  const rel = path.relative(SRC_DIR, filePath);
  console.log(`\nValidating: ${rel}`);

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    fail(`Cannot read file: ${e.message}`);
    return;
  }

  let doc;
  try {
    doc = yaml.parse(raw);
  } catch (e) {
    fail(`Invalid YAML: ${e.message}`);
    return;
  }

  if (!doc.agent) {
    fail('Missing top-level "agent" key');
    return;
  }

  const agent = doc.agent;

  // metadata checks
  if (!agent.metadata) {
    fail('Missing agent.metadata');
  } else {
    if (!agent.metadata.id) fail('Missing agent.metadata.id');
    else pass(`id: ${agent.metadata.id}`);

    if (!agent.metadata.name) fail('Missing agent.metadata.name');
    else pass(`name: ${agent.metadata.name}`);

    if (!agent.metadata.title) fail('Missing agent.metadata.title');
    else pass(`title: ${agent.metadata.title}`);
  }

  // persona checks
  if (!agent.persona) {
    fail('Missing agent.persona');
  } else {
    if (!agent.persona.role) fail('Missing agent.persona.role');
    else pass(`role: ${agent.persona.role.substring(0, 50)}...`);

    if (!agent.persona.identity) fail('Missing agent.persona.identity');
    else pass('identity: present');
  }

  // menu checks
  if (!agent.menu || !Array.isArray(agent.menu)) {
    fail('Missing or invalid agent.menu (must be array)');
  } else {
    pass(`menu: ${agent.menu.length} item(s)`);
    agent.menu.forEach((item, i) => {
      if (!item.trigger) fail(`menu[${i}] missing trigger`);
      if (!item.description) fail(`menu[${i}] missing description`);
      if (!item.exec && !item.workflow) fail(`menu[${i}] missing exec or workflow`);
    });
  }
}

function findAgentFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAgentFiles(fullPath));
    } else if (entry.name.endsWith('.agent.yaml')) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('='.repeat(50));
console.log('PR Review Kit — Agent Schema Validation');
console.log('='.repeat(50));

const agentFiles = findAgentFiles(SRC_DIR);
console.log(`\nFound ${agentFiles.length} agent file(s)\n`);

for (const f of agentFiles) {
  validateAgent(f);
}

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
