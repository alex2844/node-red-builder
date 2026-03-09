import path from 'path';
import fs from 'fs/promises';
import { loadConfig } from '../config.js';
import { copyTemplate, toPascalCase } from '../utils.js';

export async function add(/** @type {string} */ nodeName) {
	if (!nodeName) {
		console.error('❌ Please provide a node name.');
		console.error('   Usage: nrb add <node-name>');
		console.error('   Example: nrb add temperature-sensor');
		process.exit(1);
	}

	if (!/^[a-z][a-z0-9-]*$/.test(nodeName)) {
		console.error(`❌ Invalid node name: "${nodeName}"`);
		console.error('   Node name must be lowercase, start with a letter, and only contain letters, numbers, and hyphens.');
		process.exit(1);
	}

	const cwd = process.cwd();
	const config = await loadConfig();
	const nodeClass = toPascalCase(nodeName) + 'Node';

	console.log(`\n➕ Adding node: "${config.prefix}-${nodeName}"\n`);

	const replacements = {
		'__PREFIX__': config.prefix,
		'__NODE_NAME__': nodeName,
		'__NODE_CLASS__': nodeClass
	};

	await copyTemplate('src/nodes/node/runtime.js', `src/nodes/${nodeName}/runtime.js`, replacements);
	await copyTemplate('src/nodes/node/ui.js', `src/nodes/${nodeName}/ui.js`, replacements);
	await copyTemplate('src/nodes/node/template.html', `src/nodes/${nodeName}/template.html`, replacements);
	await copyTemplate('src/locales/en-US/node.json', `src/locales/en-US/${nodeName}.json`, replacements);
	await copyTemplate('docs/en-US/nodes/node.md', `docs/en-US/nodes/${nodeName}.md`, replacements);

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
