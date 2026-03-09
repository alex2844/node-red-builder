import path from 'path';
import fs from 'fs/promises';
import { copyTemplate } from '../utils.js';

function getPackageManager() {
	const agent = process.env.npm_config_user_agent || '';
	if (agent.startsWith('bun'))
		return 'bun';
	if (agent.startsWith('pnpm'))
		return 'pnpm';
	if (agent.startsWith('yarn'))
		return 'yarn';
	if (typeof Bun !== 'undefined')
		return 'bun';
	return 'npm';
}

export async function init(/** @type {string|undefined} */ targetDir) {
	if (targetDir) {
		await fs.mkdir(targetDir, { recursive: true });
		process.chdir(targetDir);
	}

	const cwd = process.cwd();
	console.log('🚀 Initializing new node-red-builder project...\n');

	const projectName = cwd.split(path.sep).pop();
	if (!projectName) {
		console.error('❌ Could not determine project name from directory.');
		return;
	}

	let prefix = projectName
		.replace(/^node-red-contrib-/, '')
		.replace(/^node-red-/, '')
		.toLowerCase()
		.replace(/\s+/g, '-');
	if (!prefix || prefix === 'node-red')
		prefix = 'custom';

	console.log(`⚙️  Guessed prefix: "${prefix}"`);

	const replacements = {
		'__PREFIX__': prefix,
		'__NODE_NAME__': 'example',
		'__NODE_CLASS__': 'ExampleNode'
	};

	const pkgPath = path.join(cwd, 'package.json');
	try {
		await fs.access(pkgPath);
		console.log('⏭️  Skipped: package.json');
	} catch {
		await fs.writeFile(pkgPath, JSON.stringify({
			'name': `node-red-contrib-${prefix}`,
			'description': 'Custom Node-RED nodes built with node-red-builder',
			'version': '1.0.0',
			'type': 'module',
			'scripts': {
				'start': 'node-red-builder start',
				'dev': 'node-red-builder dev',
				'build': 'node-red-builder build',
				'prepack': 'bun run build'
			},
			'node-red': {
				'version': '>=3.0.0',
				'nodes': {
					'example': 'dist/nodes/example.js'
				}
			},
			'files': [
				'./dist/',
				'./examples/'
			],
			'devDependencies': {
				'node-red': 'latest',
				'node-red-builder': 'latest'
			},
			'engines': {
				'node': '>=18.0.0'
			}
		}, null, 2) + '\n');
		console.log(`✅ Created: package.json`);
	}

	const gitignorePath = path.join(cwd, '.gitignore');
	try {
		await fs.access(gitignorePath);
		console.log(`⏭️  Skipped: .gitignore`);
	} catch {
		await fs.writeFile(gitignorePath, ['node_modules/', 'dist/', '.dev/', '.cred.json'].join('\n'));
		console.log(`✅ Created: .gitignore`);
	}

	await copyTemplate('node-red-builder.config.js', 'node-red-builder.config.js', replacements);
	await copyTemplate('src/nodes/node/runtime.js', 'src/nodes/example/runtime.js', replacements);
	await copyTemplate('src/nodes/node/ui.js', 'src/nodes/example/ui.js', replacements);
	await copyTemplate('src/nodes/node/template.html', 'src/nodes/example/template.html', replacements);
	await copyTemplate('src/locales/en-US/node.json', 'src/locales/en-US/example.json', replacements);
	await copyTemplate('docs/en-US/nodes/node.md', 'docs/en-US/nodes/example.md', replacements);

	const pm = getPackageManager();
	console.log('\n🎉 Project initialized successfully!');
	console.log('\nNext steps:');
	if (targetDir)
		console.log(`  1. cd ${targetDir}`);
	console.log(`  ${targetDir ? '2' : '1'}. ${pm} install`);
	console.log(`  ${targetDir ? '3' : '2'}. ${pm} run dev`);
	console.log('\nHappy coding! 🚀');
}
