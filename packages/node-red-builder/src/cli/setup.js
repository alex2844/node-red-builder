import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync, readdirSync, lstatSync, renameSync, rmSync, mkdirSync } from 'fs';
import path from 'path';
import { createSymlink } from './utils.js';

/** @typedef {Partial<import('node-red').NodeDef> & { label?: string, env?: any[] }} NodeTab */

/**
 * Sets up the Node-RED environment.
 * Creates necessary directories, symlinks examples, handles credentials, and generates flows.json.
 *
 * @param {string} cwd - Current working directory
 */
export async function setup(cwd) {
	const userDir = path.join(cwd, '.dev');
	const credFile = path.join(cwd, '.cred.json');
	const flowFile = path.join(userDir, 'flows.json');
	const linkPath = path.join(cwd, '.dev/lib/flows');
	const examplesPath = path.join(cwd, 'examples');
	const flowCredFile = path.join(path.dirname(flowFile), `${path.basename(flowFile, '.json')}_cred.json`);

	let /** @type {Record<string, any>} */ credentialsData = {};

	if (existsSync(examplesPath))
		try {
			await createSymlink(examplesPath, linkPath);
		} catch {}

	if (existsSync(credFile))
		try {
			const content = await fs.readFile(credFile, 'utf8');
			credentialsData = JSON.parse(content);
			await fs.copyFile(credFile, flowCredFile);
		} catch (err) {
			console.error('❌ Failed to load credentials:', err);
		}

	if (!existsSync(flowFile) && existsSync(examplesPath))
		try {
			const exampleFiles = (await fs.readdir(examplesPath)).filter(file => file.endsWith('.json'));
			const /** @type {NodeTab[]} */ allNodes = [];
			const tabUsage = new Map();

			for (const filename of exampleFiles) {
				const exampleContent = await fs.readFile(path.join(examplesPath, filename), 'utf8');
				const /** @type {NodeTab[]} */ exampleNodes = JSON.parse(exampleContent);
				const uniqueTabIdsInFile = new Set(exampleNodes.map(({ z }) => z).filter(Boolean));
				for (const tabId of uniqueTabIdsInFile) {
					if (!tabUsage.has(tabId))
						tabUsage.set(tabId, []);
					tabUsage.get(tabId).push(filename);
				}
			}

			const processedTabs = new Set();
			const conflictIdMap = new Map();
			let flowCounter = 0;

			for (const filename of exampleFiles) {
				const exampleContent = await fs.readFile(path.join(examplesPath, filename), 'utf8');
				const /** @type {NodeTab[]} */ exampleNodes = JSON.parse(exampleContent);

				for (const node of exampleNodes) {
					if (node.type === 'tab')
						continue;

					if (!node.z) {
						allNodes.push(node);
						continue;
					}

					const originalTabId = node.z;
					let finalTabId = originalTabId;

					if (tabUsage.get(originalTabId)?.length > 1) {
						if (!conflictIdMap.has(originalTabId))
							conflictIdMap.set(originalTabId, `flow_${Date.now()}_${flowCounter++}`);
						finalTabId = conflictIdMap.get(originalTabId);
					}

					if (!processedTabs.has(finalTabId)) {
						const originalTabNode = exampleNodes.find(({ type, id }) => (type === 'tab') && (id === originalTabId));
						const label = originalTabNode?.label || filename.replace('.json', '').replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
						const /** @type {NodeTab} */ newTabNode = { id: finalTabId, type: 'tab', label };

						const credsForTab = credentialsData[originalTabId];
						if (credsForTab && (typeof credsForTab === 'object') && (Object.keys(credsForTab).length > 0))
							newTabNode.env = Object.keys(credsForTab).map(name => ({ name, type: 'cred' }));

						allNodes.push(newTabNode);
						processedTabs.add(finalTabId);
					}

					node.z = finalTabId;
					allNodes.push(node);
				}
			}

			await fs.writeFile(flowFile, JSON.stringify(allNodes, null, '\t'));
		} catch (err) {
			console.error('❌ Failed to generate flows.json:', err);
		}
}

/**
 * Saves credentials from the runtime back to the source file.
 * Should be called on process exit.
 *
 * @param {string} cwd - Current working directory
 */
export function saveCredentials(cwd) {
	const userDir = path.join(cwd, '.dev');
	const credFile = path.join(cwd, '.cred.json');
	const flowFile = path.join(userDir, 'flows.json');
	const flowCredFile = path.join(path.dirname(flowFile), `${path.basename(flowFile, '.json')}_cred.json`);

	if (existsSync(flowCredFile))
		try {
			const content = readFileSync(flowCredFile, 'utf8');
			const credentialsData = JSON.parse(content);
			writeFileSync(credFile, JSON.stringify(credentialsData, null, '\t'));
			console.log('💾 Credentials saved');
		} catch (err) {
			console.error('❌ Failed to save credentials:', err);
		}
}

/**
 * Synchronizes examples from the runtime back to the source directory.
 * Moves new examples created in Node-RED local library to the project 'examples' folder.
 * Should be called on process exit.
 *
 * @param {string} cwd - Current working directory
 */
export function syncExamples(cwd) {
	const userDir = path.join(cwd, '.dev');
	const linkPath = path.join(userDir, 'lib/flows');
	const examplesPath = path.join(cwd, 'examples');

	if (existsSync(linkPath)) {
		try {
			const stats = lstatSync(linkPath);

			if (stats.isSymbolicLink())
				return;

			if (stats.isDirectory()) {
				const files = readdirSync(linkPath).filter(f => f.endsWith('.json'));

				if (files.length > 0) {
					if (!existsSync(examplesPath)) {
						mkdirSync(examplesPath, { recursive: true });
						console.log('📂 Created examples directory');
					}

					for (const file of files) {
						const src = path.join(linkPath, file);
						const dest = path.join(examplesPath, file);
						try {
							renameSync(src, dest);
							console.log(`📦 Moved example "${file}" to examples/`);
						} catch (err) {
							console.error(`❌ Failed to move example "${file}":`, err);
						}
					}
				}

				try {
					rmSync(linkPath, { recursive: true, force: true });
				} catch (err) {
					console.error('❌ Failed to clean up .dev/lib/flows:', err);
				}
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			console.error('❌ Failed to sync examples:', msg);
		}
	}
}
