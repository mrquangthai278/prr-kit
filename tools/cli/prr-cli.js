#!/usr/bin/env node
/**
 * PR Review CLI — Main entry point
 * Usage: node tools/cli/prr-cli.js <command> [options]
 */

const { program } = require('commander');
const path = require('node:path');
const fs = require('node:fs');

const packageJson = require('../../package.json');

// Dynamically load all command modules from commands/
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const cmd = require(path.join(commandsPath, file));

  const command = program
    .command(cmd.command)
    .description(cmd.description);

  for (const option of cmd.options || []) {
    command.option(...option);
  }

  command.action(cmd.action);
}

program
  .name('pr-review')
  .version(packageJson.version)
  .description('PR Review Kit — AI-driven code review agent system');

program.parse(process.argv);
