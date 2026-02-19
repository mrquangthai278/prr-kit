/**
 * UI — Interactive prompts for installation
 * Interactive CLI UI for PR Review installer
 */
const clack = require('@clack/prompts');
const path = require('node:path');
const { parseList, resolveDirectory, getSystemUsername } = require('./cli-utils');
const { Detector } = require('../installers/lib/core/detector');
const { IdeManager } = require('../installers/lib/ide/manager');

const detector = new Detector();
const ideManager = new IdeManager();

class UI {
  /**
   * Prompt user through the full install configuration
   * @param {Object} cliOptions - Parsed CLI options
   * @returns {Object} config object for Installer
   */
  async promptInstall(cliOptions) {
    await ideManager.ensureInitialized();

    clack.intro('PR Review — AI-driven Code Review Framework');

    const projectDir = resolveDirectory(cliOptions.directory);
    const dirName = path.basename(projectDir);

    // Check for existing installation
    const existing = await detector.detect(projectDir);
    let actionType = cliOptions.action || null;

    if (existing.installed && !actionType) {
      if (cliOptions.yes) {
        actionType = 'update';
      } else {
        actionType = await clack.select({
          message: `PR Review v${existing.version} is already installed. What would you like to do?`,
          options: [
            { value: 'update', label: 'Full Update — reinstall all modules' },
            { value: 'quick-update', label: 'Quick Update — refresh files, keep settings' },
            { value: 'cancel', label: 'Cancel' },
          ],
        });
        if (clack.isCancel(actionType)) return { actionType: 'cancel' };
      }
    } else if (!actionType) {
      actionType = 'install';
    }

    if (actionType === 'cancel') return { actionType: 'cancel' };
    if (actionType === 'quick-update') {
      return { actionType: 'quick-update', projectDir, existing };
    }

    // Collect core config
    const userName = cliOptions.userName
      || (!cliOptions.yes && await this._ask('What should reviewers call you?', getSystemUsername()))
      || getSystemUsername();

    const communicationLanguage = cliOptions.communicationLanguage
      || (!cliOptions.yes && await this._ask('Language for reviewer agents?', 'English'))
      || 'English';

    const outputFolder = cliOptions.outputFolder
      || (!cliOptions.yes && await this._ask('Output folder (relative to project root)?', '_prr-output'))
      || '_prr-output';

    // PRR module config
    const targetRepo = cliOptions.targetRepo
      || (!cliOptions.yes && await this._ask('Path to the git repo to review?', '.'))
      || '.';

    const githubRepo = cliOptions.githubRepo
      || (!cliOptions.yes && await this._ask('GitHub repo for posting comments? (owner/repo, blank to skip)', ''))
      || '';

    // Modules (default: prr)
    const modulesInput = cliOptions.modules
      ? parseList(cliOptions.modules)
      : ['prr'];

    // IDEs
    let selectedIdes = cliOptions.tools === 'none'
      ? []
      : cliOptions.tools
        ? parseList(cliOptions.tools)
        : null;

    if (selectedIdes === null && !cliOptions.yes) {
      const availableIdes = ideManager.getAvailableIdes();
      const choices = await clack.multiselect({
        message: 'Which IDEs should PR Review be configured for?',
        options: availableIdes.map((ide) => ({
          value: ide.value,
          label: ide.name,
          hint: ide.preferred ? 'recommended' : undefined,
        })),
        required: false,
      });
      selectedIdes = clack.isCancel(choices) ? [] : choices;
    } else if (selectedIdes === null) {
      selectedIdes = ideManager.getPreferredIdes().map((ide) => ide.value);
    }

    clack.outro('Configuration complete — starting installation...');

    return {
      actionType,
      projectDir,
      userName,
      communicationLanguage,
      outputFolder,
      targetRepo,
      githubRepo,
      selectedModules: modulesInput,
      selectedIdes,
      existing,
    };
  }

  async _ask(message, defaultValue) {
    const result = await clack.text({
      message,
      placeholder: defaultValue,
      defaultValue,
    });
    if (clack.isCancel(result)) return defaultValue;
    return result || defaultValue;
  }
}

module.exports = { UI };
