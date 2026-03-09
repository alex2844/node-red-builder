import path from 'path';
import { watch } from 'fs';
import { build } from './build.js';
import { runNodeRed } from './start.js';
import { loadConfig } from '../config.js';
import { dirExists, linkPackage } from '../utils.js';
import { setup, saveCredentials, syncExamples } from '../setup.js';
/** @import { ChildProcess } from 'child_process' */

export async function dev(
	/** @type {import('../config.js').BuilderConfig} */ config,
	/** @type {{ port?: number }} */ argv
) {
	const cwd = process.cwd();
	await setup(cwd);
	await linkPackage();

	const port = argv.port ?? config.port;
	const configWithPort = { ...config, port };

	let /** @type {ChildProcess|null} */ nodeRedProcess = null;
	let isStopping = false;

	async function startNodeRed() {
		if (nodeRedProcess) {
			const proc = nodeRedProcess;
			await new Promise((resolve) => {
				if (proc.exitCode !== null)
					return resolve(null);

				const timeout = setTimeout(() => {
					console.log('⚠️  Node-RED is taking too long to stop, forcing SIGKILL...');
					proc.kill('SIGKILL');
				}, 3000);

				const onExit = () => {
					clearTimeout(timeout);
					resolve(null);
				};

				proc.once('exit', onExit);
				proc.once('close', onExit);

				proc.kill('SIGTERM');
			});
			nodeRedProcess = null;
		}

		if (!isStopping)
			nodeRedProcess = await runNodeRed(configWithPort);
	}

	['SIGINT', 'SIGTERM'].forEach(signal => process.on(signal, async () => {
		if (isStopping)
			return;
		isStopping = true;
		console.log('\n🛑 Stopping Node-RED...');

		if (nodeRedProcess) {
			nodeRedProcess.kill('SIGTERM');
			await new Promise(resolve => nodeRedProcess?.once('exit', resolve));
		}

		saveCredentials(cwd);
		syncExamples(cwd);
		process.exit(0);
	}));

	let isBuilding = false;
	let /** @type {ReturnType<typeof setTimeout>|null} */ timeout = null;

	const configFiles = ['package.json', 'node-red-builder.config.js'];
	let currentConfig = config;

	const /** @type {Map<string, import('fs').FSWatcher>} */ activeWatchers = new Map();

	const setupWatcher = async (/** @type {string} */ dirPath, /** @type {boolean} */ recursive = true) => {
		const absolutePath = path.resolve(dirPath);
		if (!(await dirExists(absolutePath)))
			return;

		for (const watchedPath of activeWatchers.keys()) {
			if (absolutePath === watchedPath || absolutePath.startsWith(watchedPath + path.sep))
				return;
		}

		try {
			const watcher = watch(absolutePath, { recursive }, (_event, filename) => {
				handleChange(filename ?? undefined);
			});
			activeWatchers.set(absolutePath, watcher);
		} catch (err) {
			console.error(`⚠️  Failed to watch ${absolutePath}:`, err);
		}
	};

	const handleChange = (/** @type {string|undefined} */ filename) => {
		if (filename) {
			const basename = path.basename(filename);
			if (basename.endsWith('~') || basename.startsWith('.'))
				return;
		}

		if (timeout)
			clearTimeout(timeout);
		timeout = setTimeout(async () => {
			if (isBuilding)
				return;
			isBuilding = true;
			console.log(filename ? `\n🔄 File changed: ${filename}, rebuilding...` : '\n🔄 File changed, rebuilding...');
			try {
				if (filename && configFiles.includes(filename))
					currentConfig = await loadConfig();

				await setupWatcher(currentConfig.srcDir);
				await setupWatcher(currentConfig.docsDir);
				await setupWatcher(currentConfig.localesDir);

				if (!(await dirExists(currentConfig.srcDir))) {
					console.error(`❌ Error: Source directory "${currentConfig.srcDir}" not found. Please create it to start building.`);
					return;
				}

				await build(currentConfig);
				await startNodeRed();
			} catch (err) {
				console.error('❌ Build failed:', err);
			} finally {
				isBuilding = false;
			}
		}, 300);
	};

	if (!(await dirExists(currentConfig.srcDir)))
		console.warn(`⚠️  Warning: Source directory "${currentConfig.srcDir}" not found. Waiting for it to be created...`);
	else {
		await build(currentConfig);
		await startNodeRed();
	}

	await setupWatcher(currentConfig.srcDir);
	await setupWatcher(currentConfig.docsDir);
	await setupWatcher(currentConfig.localesDir);

	try {
		watch(cwd, (_event, filename) => {
			if (filename) {
				if (configFiles.includes(filename))
					handleChange(filename);
				else {
					const fullPath = path.resolve(cwd, filename);
					const isKnownDir = [currentConfig.srcDir, currentConfig.docsDir, currentConfig.localesDir].some(dir => fullPath === path.resolve(dir));
					if (isKnownDir)
						handleChange(filename);
				}
			}
		});
	} catch (err) {
		console.error('⚠️  Failed to watch root directory for changes:', err);
	}

	console.log(`\n👀 Watching for changes in src, docs and config files...`);
}
