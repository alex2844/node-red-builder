import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { linkPackage } from '../utils.js';
import { setup, saveCredentials, syncExamples } from '../setup.js';
/** @import { ChildProcess } from 'child_process' */
/** @import { BuilderConfig } from '../config.js' */

/**
 * Spawns the Node-RED process.
 * 
 * @param {BuilderConfig} config
 * @param {{ port?: number }} argv
 * @returns {Promise<ChildProcess>}
 */
export async function runNodeRed(config, argv = {}) {
	const port = argv.port ?? config.port;
	const settingsPath = path.resolve(import.meta.dir, '../settings.cjs');

	console.log('🚀 Starting Node-RED...');

	const localNodeRed = path.resolve(process.cwd(), 'node_modules/.bin/node-red');
	const isWindows = process.platform === 'win32';
	const localNodeRedWin = localNodeRed + '.cmd';

	let command = 'node-red';
	try {
		if (isWindows) {
			await fs.access(localNodeRedWin);
			command = localNodeRedWin;
		} else {
			await fs.access(localNodeRed);
			command = localNodeRed;
		}
	} catch {}

	const child = spawn(command, ['-s', settingsPath, '-p', String(port)], {
		stdio: 'inherit',
		cwd: process.cwd(),
		shell: isWindows
	});

	return child;
}

/**
 * CLI command to start Node-RED with full setup and signal handling.
 * 
 * @param {BuilderConfig} config
 * @param {{ port?: number }} argv
 * @returns {Promise<ChildProcess>}
 */
export async function start(config, argv = {}) {
	await setup(process.cwd());
	await linkPackage();

	const child = await runNodeRed(config, argv);

	let isStopping = false;

	child.on('exit', () => {
		saveCredentials(process.cwd());
		syncExamples(process.cwd());
		if (isStopping)
			process.exit(0);
	});

	['SIGINT', 'SIGTERM'].forEach(signal => process.on(signal, () => {
		if (!isStopping) {
			console.log('\n🛑 Stopping Node-RED...');
			isStopping = true;
		}
		child.kill('SIGTERM');
	}));

	return child;
}
