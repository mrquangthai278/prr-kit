const { Installer } = require('../installers/lib/core/installer');
const prompts = require('../lib/prompts');

const installer = new Installer();

module.exports = {
  command: 'status',
  description: 'Show current PR Review installation status',
  options: [
    ['--directory <path>', 'Project directory (default: current directory)'],
  ],
  action: async (options) => {
    try {
      const projectDir = options.directory
        ? require('node:path').resolve(options.directory)
        : process.cwd();

      const status = await installer.status(projectDir);

      if (!status.installed) {
        await prompts.log.warn('PR Review is not installed in this directory.');
        await prompts.log.info('Run `npx pr-review install` to get started.');
        process.exit(0);
      }

      await prompts.log.success(`PR Review v${status.version} installed`);
      await prompts.log.info(`Modules: ${status.modules.join(', ')}`);
      await prompts.log.info(`IDEs configured: ${status.ides.join(', ') || 'none'}`);
      await prompts.log.info(`Install date: ${status.installDate}`);
      process.exit(0);
    } catch (error) {
      await prompts.log.error(`Status check failed: ${error.message}`);
      process.exit(1);
    }
  },
};
