#!/usr/bin/env bun

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { init } from 'node-red-builder/cli/init';

const { version } = await Bun.file(new URL('../package.json', import.meta.url)).json();

await yargs(hideBin(process.argv))
	.scriptName('npm create node-red')
	.usage('$0 [projectDir]')
	.command('$0 [projectDir]', 'Scaffold a new Node-RED project', (yargs) => {
		yargs.positional('projectDir', {
			type: 'string',
			describe: 'Target directory for the project'
		});
	}, async (/** @type {any} */ argv) => {
		await init(argv.projectDir);
	})
	.example('$0', 'Initialize project in the current directory')
	.example('$0 my-cool-node', 'Create "my-cool-node" directory and initialize project there')
	.help()
	.alias('h', 'help')
	.version(version)
	.alias('v', 'version')
	.parse();
