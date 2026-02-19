const { Installer } = require('../installers/lib/core/installer');
const prompts = require('../lib/prompts');

const installer = new Installer();

module.exports = {
  command: 'uninstall',
  description: 'Remove PR Review installation from a project',
  options: [
    ['--directory <path>', 'Project directory (default: current directory)'],
    ['-y, --yes', 'Skip confirmation prompt'],
  ],
  action: async (options) => {
    try {
      const projectDir = options.directory
        ? require('node:path').resolve(options.directory)
        : process.cwd();

      if (!options.yes) {
        const { confirm } = require('@clack/prompts');
        const ok = await confirm({
          message: `Remove PR Review from ${projectDir}?`,
        });
        if (!ok) {
          await prompts.log.warn('Uninstall cancelled.');
          process.exit(0);
        }
      }

      await installer.uninstall(projectDir);
      await prompts.log.success('PR Review uninstalled successfully.');
      process.exit(0);
    } catch (error) {
      await prompts.log.error(`Uninstall failed: ${error.message}`);
      process.exit(1);
    }
  },
};
