#!/usr/bin/env bun

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadConfig } from '../src/cli/config.js';
import { build } from '../src/cli/commands/build.js';
import { dev } from '../src/cli/commands/dev.js';
import { start } from '../src/cli/commands/start.js';
import { init } from '../src/cli/commands/init.js';
import { add } from '../src/cli/commands/add.js';

const { version } = await Bun.file(new URL('../package.json', import.meta.url)).json();

await yargs(hideBin(process.argv))
	.scriptName('nrb')
	.usage('$0 <command> [options]')

	.command('init [projectDir]', 'Initialize a new project', (yargs) => {
		yargs.positional('projectDir', {
			type: 'string',
			describe: 'Target directory for the project'
		});
	}, async (/** @type {any} */ argv) => {
		await init(argv.projectDir);
	})

	.command('add <name>', 'Add a new node to existing project', (yargs) => {
		yargs.positional('name', {
			type: 'string',
			describe: 'Name of the node (e.g., temperature-sensor)'
		});
	}, async (/** @type {any} */ argv) => {
		await add(argv.name);
	})

	.command('build', 'Build all nodes for production', async () => {
		const config = await loadConfig();
		await build(config);
	})

	.command('dev', 'Build and start Node-RED with hot reload', (yargs) => {
		return yargs.option('port', {
			type: 'number',
			describe: 'Override port from config'
		});
	}, async (argv) => {
		const config = await loadConfig();
		await dev(config, argv);
	})

	.command('start', 'Start Node-RED only (no build, no watch)', (yargs) => {
		return yargs.option('port', {
			type: 'number',
			describe: 'Override port from config'
		});
	}, async (argv) => {
		const config = await loadConfig();
		await start(config, argv);
	})

	.help()
	.alias('h', 'help')
	.version(version)
	.alias('v', 'version')
	.demandCommand(1, 'You need at least one command before moving on')
	.strict()
	.recommendCommands()
	.parse();
