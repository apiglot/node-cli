#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { pathToFileURL } from 'url';
import { listFiles, getFileInfo, api } from './utils.js';
import translate from './commands/translate.js';
import { registerInitCommand } from './commands/init.js'
import { registerGenerateCommand } from './commands/generate.js';

var config = null;

async function loadConfig() {
  if(config !== null) return config;
  const fileName = 'apiglot.config.js';
  // 1. Resolve the absolute path to the user's current directory
  const configPath = path.resolve(process.cwd(), fileName);

  try {
    // 2. Convert path to a File URL (required for dynamic import on Windows)
    const fileUrl = pathToFileURL(configPath).href;
    
    // 3. Dynamically import the module
    const module = await import(fileUrl);
    
    // 4. Return the default export or the whole module
    config = module.default || module;
    return config;
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('No config file found, using defaults.');
      return {}; // Return empty or default settings
    }
    throw err;
  }
}

const program = new Command();

program
  .name('apiglot')
  .description("Apiglot's official CLI to help you implement i18n in your projects")
  .version('1.0.0');

registerInitCommand(program);
registerGenerateCommand(program);

const project = program.command('project').description('Project related commands');

project.command("info").description("Get information about the current project").action(async () => {
    const config = await loadConfig();
    try {
        const result = await api.get(`/projects/${config.projectId}/info`);
        console.log(chalk.blue('Project Information:', JSON.stringify(result, null, 2)));
    } catch (error) {
        console.error(chalk.red('Error fetching project info:'), error.message);
    }
    
    // console.log(chalk.green(`Name: ${config.name || 'Unnamed Project'}`));
    // console.log(chalk.green(`Version: ${config.version || 'N/A'}`));
    // console.log(chalk.green(`Description: ${config.description || 'No description provided.'}`));
});

project.command("languages")
  .description("List the target languages selected for this project")
  .action(async () => {
    const config = await loadConfig();
    if(config.languages) {
        console.log(chalk.blue('Target languages for this project:'));
        config.languages.forEach(lang => {
        console.log(chalk.green(`- ${lang}`));
        });
    } else {
        console.log(chalk.yellow('No target languages defined in the config.'));
    }
    });

// Define a "info" command
program
  .command('info')
  .description('Get information about the CLI tool')
  .action(async () => {
    const config = await loadConfig();
    console.log('Loaded config:', config);
    const greeting = `Hello, ${name}!`;

    if (options.priority) {
      console.log(chalk.bgYellow.black.bold(' PRIORITY '));
      console.log(chalk.yellow.bold(greeting));
    } else {
      console.log(chalk.green('Success:'), chalk.cyan(greeting));
    }
  });

program.command('translate')
    .description('Translation related commands')
    .action(translate);

// Error handling for unknown commands
program.on('command:*', () => {
  console.error(chalk.red('\nInvalid command: %s\n'), program.args.join(' '));
  console.log('See --help for a list of available commands.');
  process.exit(1);
});

program.parse(process.argv);
