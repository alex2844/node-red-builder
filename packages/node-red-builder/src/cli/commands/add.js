import path from 'path';
import fs from 'fs/promises';
import { loadConfig } from '../config.js';
import { generateNode } from '../utils.js';

async function detectConfigNodes(/** @type {string} */ cwd) {
	const nodesDir = path.join(cwd, 'src/nodes');
	try {
		const dirs = await fs.readdir(nodesDir);
		const configs = [];
		for (const dir of dirs) {
			const uiPath = path.join(nodesDir, dir, 'ui.js');
			try {
				const content = await fs.readFile(uiPath, 'utf8');
				if (content.includes("category: 'config'"))
					configs.push(dir);
			} catch {}
		}
		return configs;
	} catch {
		return [];
	}
}

/**
 * @param {string|undefined} nodeName
 * @param {'node'|'config'} type
 * @param {string|undefined} configNode
 * @param {boolean} skipConfig
 * @returns {Promise<void>}
 */
export async function add(nodeName, type = 'node', configNode, skipConfig = false) {
	const isConfigNode = type === 'config';
	if (isConfigNode && !nodeName)
		nodeName = 'config';

	if (!nodeName) {
		console.error('❌ Please provide a node name.');
		console.error('   Usage: nrb add <node-name>');
		process.exit(1);
	}

	if (!/^[a-z][a-z0-9-]*$/.test(nodeName)) {
		console.error(`❌ Invalid node name: "${nodeName}"`);
		console.error('   Node name must be lowercase, start with a letter, and only contain letters, numbers, and hyphens.');
		process.exit(1);
	}

	const cwd = process.cwd();

	try {
		await fs.access(path.join(cwd, 'src/nodes', nodeName));
		console.error(`❌ Node "${nodeName}" already exists.`);
		console.error(`   Please choose a different name or delete the existing directory: src/nodes/${nodeName}`);
		process.exit(1);
	} catch {}

	const config = await loadConfig();

	console.log(`\n➕ Adding ${type} node: "${config.prefix}-${nodeName}"\n`);

	if (!isConfigNode && !configNode && !skipConfig) {
		const configNodes = await detectConfigNodes(cwd);

		if (configNodes.length === 1) {
			const answer = prompt(`🔗 Found configuration node "${configNodes[0]}". Use it? (y/N)`);
			if (answer?.toLowerCase() === 'y')
				configNode = configNodes[0];
		} else if (configNodes.length > 1) {
			console.log('🔗 Found multiple configuration nodes:');
			configNodes.forEach((name, i) => console.log(`   ${i + 1}. ${name}`));
			const answer = prompt(`   Select a config node (1-${configNodes.length}) or press Enter to skip:`);
			const idx = parseInt(answer || '0') - 1;
			if (idx >= 0 && idx < configNodes.length)
				configNode = configNodes[idx];
		}
	}

	if (configNode)
		console.log(`✅ Linking to "${configNode}"`);

	await generateNode({
		type, nodeName, configNode,
		prefix: config.prefix,
		color: config.palette.color
	});

	const pkgPath = path.join(cwd, 'package.json');
	try {
		const raw = await fs.readFile(pkgPath, 'utf8');
		const pkg = JSON.parse(raw);

		if (!pkg['node-red'])
			pkg['node-red'] = {};
		if (!pkg['node-red'].nodes)
			pkg['node-red'].nodes = {};

		if (pkg['node-red'].nodes[nodeName])
			console.log(`⏭️  Skipped package.json entry for "${nodeName}" (already exists)`);
		else {
			pkg['node-red'].nodes[nodeName] = `dist/nodes/${nodeName}.js`;
			await fs.writeFile(pkgPath, JSON.stringify(pkg, null, '\t') + '\n', 'utf8');
			console.log(`📝 Updated package.json: added "${nodeName}" to node-red.nodes`);
		}
	} catch {
		console.warn('⚠️  Could not update package.json — add the node entry manually:');
		console.warn(`   "node-red": { "nodes": { "${nodeName}": "dist/nodes/${nodeName}.js" } }`);
	}

	console.log(`\n🎉 Node "${nodeName}" created successfully!`);
	console.log(`\nFiles created in src/nodes/${nodeName}/`);
	console.log('Run "nrb dev" to see it in action.');
}
