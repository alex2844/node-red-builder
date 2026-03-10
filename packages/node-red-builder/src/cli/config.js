import path from 'path';
import { access, readFile } from 'fs/promises';

/**
 * @typedef {object} BuilderConfig
 * @property {string} prefix
 * @property {string} srcDir
 * @property {string} distDir
 * @property {string} docsDir
 * @property {string} localesDir
 * @property {number} port
 * @property {{ color: string }} palette
 */

/**
 * @returns {Promise<BuilderConfig>}
 */
export async function loadConfig() {
	const cwd = process.cwd();
	const configPath = path.join(cwd, 'node-red-builder.config.js');
	let userConfig = /** @type {Partial<BuilderConfig>} */ ({});

	try {
		await access(configPath);
		const module = await import(configPath);
		userConfig = module.default || module;
	} catch (e) {
		console.log('ℹ️  No node-red-builder.config.js found, using defaults.');
	}

	let prefix = userConfig.prefix;
	if (!prefix)
		try {
			const pkgPath = path.join(cwd, 'package.json');
			const pkgRaw = await readFile(pkgPath, 'utf8');
			const pkg = JSON.parse(pkgRaw);

			if (pkg.name) {
				let name = pkg.name.split('/').pop();
				name = name.replace(/^node-red-contrib-/, '')
					.replace(/^node-red-/, '');
				prefix = name;
			}
		} catch {}

	if (!prefix)
		prefix = cwd.split(path.sep).pop()?.split('-').pop() || 'custom';

	return {
		prefix,
		srcDir: path.resolve(cwd, userConfig.srcDir || 'src'),
		distDir: path.resolve(cwd, userConfig.distDir || 'dist'),
		docsDir: path.resolve(cwd, userConfig.docsDir || 'docs'),
		localesDir: path.resolve(cwd, userConfig.localesDir || 'src/locales'),
		port: Number(userConfig.port) || 3000,
		palette: {
			color: userConfig.palette?.color || '#a6bbcf'
		}
	};
}
