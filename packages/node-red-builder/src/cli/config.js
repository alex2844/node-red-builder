import path from 'path';
import { access } from 'fs/promises';

/**
 * @typedef {object} BuilderConfig
 * @property {string} prefix
 * @property {string} srcDir
 * @property {string} distDir
 * @property {string} docsDir
 * @property {string} localesDir
 * @property {number} port
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

	return {
		prefix: userConfig.prefix || cwd.split(path.sep).pop()?.split('-').pop() || 'custom',
		srcDir: path.resolve(cwd, userConfig.srcDir || 'src'),
		distDir: path.resolve(cwd, userConfig.distDir || 'dist'),
		docsDir: path.resolve(cwd, userConfig.docsDir || 'docs'),
		localesDir: path.resolve(cwd, userConfig.localesDir || 'src/locales'),
		port: Number(userConfig.port) || 3000
	};
}
