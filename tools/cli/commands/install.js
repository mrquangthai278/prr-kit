const { Installer } = require('../installers/lib/core/installer');
const { UI } = require('../lib/ui');
const prompts = require('../lib/prompts');

const installer = new Installer();
const ui = new UI();

module.exports = {
  command: 'install',
  description: 'Install PR Review agents and workflows into your project',
  options: [
    ['-d, --debug', 'Enable debug output for manifest generation'],
    ['--directory <path>', 'Installation directory (default: current directory)'],
    ['--modules <modules>', 'Comma-separated list of module IDs to install (e.g., "prr")'],
    ['--tools <tools>', 'Comma-separated list of IDE IDs to configure (e.g., "claude-code,cursor"). Use "none" to skip.'],
    ['--action <type>', 'Action type: install, update, or quick-update'],
    ['--user-name <name>', 'Name for agents to use'],
    ['--communication-language <lang>', 'Language for agent communication (default: English)'],
    ['--output-folder <path>', 'Output folder relative to project root (default: _prr-output)'],
    ['--target-repo <path>', 'Path to git repository to review (default: .)'],
    ['--github-repo <owner/repo>', 'GitHub repository for posting comments (optional)'],
    ['-y, --yes', 'Accept all defaults and skip prompts'],
  ],
  action: async (options) => {
    try {
      if (options.debug) {
        process.env.PRR_DEBUG_MANIFEST = 'true';
        await prompts.log.info('Debug mode enabled');
      }

      const config = await ui.promptInstall(options);

      if (config.actionType === 'cancel') {
        await prompts.log.warn('Installation cancelled.');
        process.exit(0);
      }

      if (config.actionType === 'quick-update') {
        const result = await installer.quickUpdate(config);
        await prompts.log.success('Quick update complete!');
        await prompts.log.info(`Updated ${result.moduleCount} modules (${result.modules.join(', ')})`);
        process.exit(0);
      }

      const result = await installer.install(config);

      if (result && result.cancelled) {
        process.exit(0);
      }

      if (result && result.success) {
        process.exit(0);
      }
    } catch (error) {
      if (error.fullMessage) {
        await prompts.log.error(error.fullMessage);
      } else {
        await prompts.log.error(`Installation failed: ${error.message}`);
      }
      if (error.stack && process.env.PRR_DEBUG_MANIFEST) {
        await prompts.log.message(error.stack);
      }
      process.exit(1);
    }
  },
};
