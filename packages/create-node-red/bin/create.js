#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { init } from 'node-red-builder/cli/init';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await readFile(join(__dirname, '../package.json'), 'utf8'));

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
	.version(pkg.version)
	.alias('v', 'version')
	.parse();
