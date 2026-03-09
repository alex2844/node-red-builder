import path from 'path';
import fs from 'fs/promises';

/**
 * Converts a kebab-case string to PascalCase.
 *
 * @param {string} str
 * @returns {string}
 */
export function toPascalCase(str) {
	return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

/**
 * Checks if a directory exists.
 *
 * @param {string} dirPath
 * @returns {Promise<boolean>}
 */
export async function dirExists(dirPath) {
	try {
		const stats = await fs.stat(dirPath);
		return stats.isDirectory();
	} catch (error) {
		// @ts-ignore
		if (error.code === 'ENOENT')
			return false;
		throw error;
	}
}

/**
 * Returns the absolute path to the templates directory.
 *
 * @returns {string}
 */
export function getTemplatesDir() {
	return path.resolve(import.meta.dir, '../../templates');
}

/**
 * Copies a template file to a destination with variable replacements.
 *
 * @param {string} srcRelativePath - Path relative to the templates directory.
 * @param {string} destRelativePath - Path relative to the current working directory.
 * @param {Record<string, string>} [replacements] - Key-value pairs for replacement (e.g., { '__PREFIX__': 'my-prefix' }).
 */
export async function copyTemplate(srcRelativePath, destRelativePath, replacements = {}) {
	const templatesDir = getTemplatesDir();
	const cwd = process.cwd();
	const srcPath = path.join(templatesDir, srcRelativePath);
	const destPath = path.join(cwd, destRelativePath);

	try {
		await fs.access(destPath);
		console.log(`⏭️  Skipped: ${destRelativePath} (already exists)`);
	} catch {
		await fs.mkdir(path.dirname(destPath), { recursive: true });
		let content = await fs.readFile(srcPath, 'utf8');

		for (const [key, value] of Object.entries(replacements)) {
			content = content.replace(new RegExp(key, 'g'), value);
		}

		await fs.writeFile(destPath, content, 'utf8');
		console.log(`✅ Created: ${destRelativePath}`);
	}
}

/**
 * Creates a symlink (or junction on Windows) to a directory.
 * Automatically removes existing destination if it exists.
 *
 * @param {string} src - Absolute path to the source directory.
 * @param {string} dest - Absolute path to the destination link.
 */
export async function createSymlink(src, dest) {
	await fs.mkdir(path.dirname(dest), { recursive: true });

	try {
		await fs.rm(dest, { recursive: true, force: true });
	} catch {}

	try {
		const type = process.platform === 'win32' ? 'junction' : 'dir';
		await fs.symlink(src, dest, type);
	} catch (e) {
		console.error(`❌ Failed to create symlink from ${src} to ${dest}:`, e);
		throw e;
	}
}

/**
 * Creates a symlink to the current package in .dev/node_modules.
 */
export async function linkPackage() {
	const cwd = process.cwd();
	const pkgPath = path.join(cwd, 'package.json');
	let pkgName;
	try {
		const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
		pkgName = pkg.name;
	} catch {
		return;
	}

	const devNodeModules = path.join(cwd, '.dev', 'node_modules');
	const linkDest = path.join(devNodeModules, pkgName);

	try {
		await createSymlink(cwd, linkDest);
		console.log(`🔗 Linked package "${pkgName}"`);
	} catch {}
}
