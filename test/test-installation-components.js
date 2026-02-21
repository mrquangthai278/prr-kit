#!/usr/bin/env node
/**
 * Test: Installation Components
 * Tests the core installer, manifest generator, and config collector
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

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

function section(title) {
  console.log(`\n--- ${title} ---`);
}

async function main() {
  // ---- Test: Module files exist ----
  section('Source module files');

  const SRC_DIR = path.join(__dirname, '..', 'src');

  const requiredSrcFiles = [
    'core/module.yaml',
    'core/agents/prr-master.agent.yaml',
    'core/tasks/help.md',
    'core/tasks/workflow.xml',
    'prr/module.yaml',
    'prr/agents/general-reviewer.agent.yaml',
    'prr/agents/security-reviewer.agent.yaml',
    'prr/agents/performance-reviewer.agent.yaml',
    'prr/agents/architecture-reviewer.agent.yaml',
    'prr/data/review-types.csv',
    'prr/data/stacks/vue3.md',
    'prr/data/stacks/react.md',
    'prr/data/stacks/typescript.md',
    'prr/data/stacks/python.md',
    'prr/data/stacks/csharp.md',
    'prr/data/stacks/rust.md',
    'prr/data/stacks/kubernetes.md',
    'prr/data/stacks/firebase.md',
    'prr/config-template.yaml',
    'prr/workflows/1-discover/select-pr/workflow.md',
    'prr/workflows/2-analyze/describe-pr/workflow.md',
    'prr/workflows/2-analyze/collect-pr-context/workflow.md',
    'prr/workflows/3-review/general-review/workflow.yaml',
    'prr/workflows/3-review/security-review/workflow.yaml',
    'prr/workflows/3-review/performance-review/workflow.yaml',
    'prr/workflows/3-review/architecture-review/workflow.yaml',
    'prr/workflows/3-review/business-review/instructions.xml',
    'prr/workflows/4-improve/improve-code/workflow.yaml',
    'prr/workflows/5-ask/ask-code/workflow.md',
    'prr/workflows/6-report/generate-report/workflow.md',
    'prr/workflows/6-report/post-comments/workflow.md',
    'prr/workflows/quick/workflow.md',
    'core/tasks/clear.md',
  ];

  for (const rel of requiredSrcFiles) {
    const full = path.join(SRC_DIR, rel);
    if (fs.existsSync(full)) {
      pass(rel);
    } else {
      fail(`Missing: ${rel}`);
    }
  }

  // ---- Test: CLI tool files exist ----
  section('CLI tool files');

  const TOOLS_DIR = path.join(__dirname, '..', 'tools');

  const requiredToolFiles = [
    'prr-npx-wrapper.js',
    'cli/prr-cli.js',
    'cli/commands/install.js',
    'cli/commands/uninstall.js',
    'cli/commands/status.js',
    'cli/lib/prompts.js',
    'cli/lib/xml-utils.js',
    'cli/lib/cli-utils.js',
    'cli/lib/ui.js',
    'cli/lib/agent/compiler.js',
    'cli/lib/agent/template-engine.js',
    'cli/installers/lib/core/installer.js',
    'cli/installers/lib/core/manifest.js',
    'cli/installers/lib/core/manifest-generator.js',
    'cli/installers/lib/core/config-collector.js',
    'cli/installers/lib/core/detector.js',
    'cli/installers/lib/ide/manager.js',
    'cli/installers/lib/ide/_base-ide.js',
    'cli/installers/lib/ide/_config-driven.js',
    'cli/installers/lib/ide/platform-codes.yaml',
    'cli/installers/lib/ide/shared/path-utils.js',
    'cli/installers/lib/ide/templates/combined/default-agent.md',
    'cli/installers/lib/ide/templates/combined/default-workflow.md',
  ];

  for (const rel of requiredToolFiles) {
    const full = path.join(TOOLS_DIR, rel);
    if (fs.existsSync(full)) {
      pass(rel);
    } else {
      fail(`Missing: ${rel}`);
    }
  }

  // ---- Test: Detector module ----
  section('Detector module');

  try {
    const { Detector, PRR_FOLDER_NAME } = require('../tools/cli/installers/lib/core/detector');
    pass('Detector module loads');

    if (PRR_FOLDER_NAME === '_prr') {
      pass(`PRR_FOLDER_NAME = '${PRR_FOLDER_NAME}'`);
    } else {
      fail(`Expected PRR_FOLDER_NAME = '_prr', got '${PRR_FOLDER_NAME}'`);
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prr-test-'));
    const detector = new Detector();
    const result = await detector.detect(tmpDir);
    if (!result.installed) {
      pass('Detector correctly reports not installed in empty dir');
    } else {
      fail('Detector incorrectly reports installed in empty dir');
    }
    fs.rmSync(tmpDir, { recursive: true });
  } catch (e) {
    fail(`Detector module error: ${e.message}`);
  }

  // ---- Test: Manifest module ----
  section('Manifest module');

  try {
    const { Manifest } = require('../tools/cli/installers/lib/core/manifest');
    pass('Manifest module loads');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prr-test-'));
    const prrDir = path.join(tmpDir, '_prr');
    fs.mkdirSync(prrDir);

    const manifest = new Manifest();
    await manifest.create(prrDir, {
      version: '1.0.0',
      projectName: 'test-project',
      modules: ['core', 'prr'],
      ides: ['claude-code'],
    });
    pass('Manifest.create() runs without error');

    const read = await manifest.read(prrDir);
    if (read && read.version === '1.0.0') {
      pass('Manifest.read() returns correct data');
    } else {
      fail(`Manifest.read() returned: ${JSON.stringify(read)}`);
    }

    fs.rmSync(tmpDir, { recursive: true });
  } catch (e) {
    fail(`Manifest module error: ${e.message}`);
  }

  // ---- Test: XML utils ----
  section('XML utils');

  try {
    const { escapeXml, unescapeXml } = require('../tools/cli/lib/xml-utils');
    pass('xml-utils module loads');

    const input = '<test> & "quotes" \'apostrophe\'';
    const escaped = escapeXml(input);
    const unescaped = unescapeXml(escaped);

    if (!escaped.includes('<')) pass('escapeXml removes <');
    else fail('escapeXml did not remove <');

    if (unescaped === input) pass('unescapeXml round-trips correctly');
    else fail(`unescapeXml mismatch: "${unescaped}" vs "${input}"`);
  } catch (e) {
    fail(`xml-utils error: ${e.message}`);
  }

  // ---- Test: Template engine ----
  section('Template engine');

  try {
    const { replacePlaceholders } = require('../tools/cli/lib/agent/template-engine');
    pass('template-engine module loads');

    const result = replacePlaceholders('Hello {user_name}!', { user_name: 'Alex' });
    if (result === 'Hello Alex!') {
      pass('replacePlaceholders works correctly');
    } else {
      fail(`replacePlaceholders returned: "${result}"`);
    }
  } catch (e) {
    fail(`template-engine error: ${e.message}`);
  }

  // ---- Test: CLI utils ----
  section('CLI utils');

  try {
    const { parseList } = require('../tools/cli/lib/cli-utils');
    pass('cli-utils module loads');

    const result = parseList('core,prr');
    if (Array.isArray(result) && result.length === 2 && result[0] === 'core') {
      pass('parseList parses comma-separated values');
    } else {
      fail(`parseList returned: ${JSON.stringify(result)}`);
    }
  } catch (e) {
    fail(`cli-utils error: ${e.message}`);
  }

  // ---- Summary ----
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
