import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { copyTemplate, generateNode } from '../utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await fs.readFile(path.join(__dirname, '../../../package.json'), 'utf8'));

const devDependencies = {
	"@types/node-red": "^1.3.5",
	'node-red': '^4.1.7',
	'node-red-builder': `^${pkg.version}`,
	"typescript": "^5.9.3"
};

const engines = {
	'node': '>=18.0.0',
	'bun': '>=1.0.0'
};

function getPackageManager() {
	const agent = process.env.npm_config_user_agent || '';
	if (agent.includes('pnpm'))
		return 'pnpm';
	if (agent.includes('yarn'))
		return 'yarn';
	if (agent.includes('bun'))
		return 'bun';
	if (agent.includes('npm'))
		return 'npm';
	if (typeof Bun !== 'undefined')
		return 'bun';
	return 'npm';
}

export async function init(/** @type {string|undefined} */ targetDir) {
	let cwd = process.cwd();
	const isPackagesDir = cwd.endsWith(path.sep + 'packages') || cwd === 'packages';
	let rootPkg = null;

	if (isPackagesDir)
		try {
			const rootPkgPath = path.join(cwd, '../package.json');
			const content = await fs.readFile(rootPkgPath, 'utf8');
			rootPkg = JSON.parse(content);
		} catch {}

	if (!targetDir && rootPkg) {
		targetDir = 'node-red';
		console.log(`ℹ️  Detected monorepo "packages" directory. Defaulting target to "${targetDir}".`);
	}

	if (targetDir) {
		await fs.mkdir(targetDir, { recursive: true });
		process.chdir(targetDir);
		cwd = process.cwd();
	}

	console.log('🚀 Initializing new node-red-builder project...\n');

	const folderName = cwd.split(path.sep).pop();
	if (!folderName) {
		console.error('❌ Could not determine project name from directory.');
		return;
	}

	let prefix = '';
	const isGenericName = ['node-red', 'app', 'server', 'node-intersvyaz', 'backend', 'pkg', 'package'].includes(folderName);

	if (isGenericName && rootPkg?.name) {
		prefix = rootPkg.name
			.split('/').pop()
			.replace(/^node-/, '')
			.replace(/-node$/, '')
			.toLowerCase();
		console.log(`ℹ️  Using root project name as base for prefix: "${prefix}"`);
	} else
		prefix = folderName
			.replace(/^node-red-contrib-/, '')
			.replace(/^node-red-/, '')
			.toLowerCase()
			.replace(/\s+/g, '-');

	if (!prefix || prefix === 'node-red')
		prefix = 'custom';

	console.log(`⚙️  Resolved prefix: "${prefix}"`);

	const replacements = {
		'__PREFIX__': prefix,
		'__NODE_NAME__': 'example',
		'__NODE_CLASS__': 'ExampleNode',
		'__COLOR__': '#a6bbcf'
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
				'test': 'tsc -p ./tsconfig.json',
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
			devDependencies, engines
		}, null, 2) + '\n');
		console.log(`✅ Created: package.json`);
	}

	const tsconfigPath = path.join(cwd, 'tsconfig.json');
	try {
		await fs.access(tsconfigPath);
		console.log(`⏭️  Skipped: tsconfig.json`);
	} catch {
		await fs.writeFile(tsconfigPath, JSON.stringify({
			'compilerOptions': {
				'target': 'ESNext',
				'module': 'ESNext',
				'moduleResolution': 'bundler',
				'baseUrl': '.',
				'checkJs': true,
				'allowJs': true,
				'strict': true,
				'noEmit': true,
				'skipLibCheck': true,
				'resolveJsonModule': true
			},
			'include': [
				'./src/**/*.js'
			]
		}, null, 2) + '\n');
		console.log(`✅ Created: tsconfig.json`);
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
	await generateNode({ prefix, nodeName: 'example', color: '#a6bbcf' });

	const pm = getPackageManager();
	console.log('\n🎉 Project initialized successfully!');
	console.log('\nNext steps:');
	if (targetDir)
		console.log(`  1. cd ${targetDir}`);
	console.log(`  ${targetDir ? '2' : '1'}. ${pm} install`);
	console.log(`  ${targetDir ? '3' : '2'}. ${pm} run dev`);
	console.log('\nHappy coding! 🚀');
}
