import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

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
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	return path.resolve(__dirname, '../../templates');
}

/**
 * Escapes a string for use in a regular expression.
 *
 * @param {string} string
 * @returns {string}
 */
function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
			if (value === '') {
				const regex = new RegExp(`^.*${escapeRegExp(key)}.*(\\r?\\n|$)`, 'gm');
				content = content.replace(regex, '');
			} else
				content = content.replace(new RegExp(escapeRegExp(key), 'g'), value);
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

/**
 * Generates a new node (or config node) from templates.
 *
 * @param {object} options
 * @param {string} options.nodeName - The kebab-case name of the node (e.g. "my-device").
 * @param {string} options.prefix - The project prefix (e.g. "custom").
 * @param {string} options.color - The node color.
 * @param {'node'|'config'} [options.type='node'] - Type of node to generate.
 * @param {string} [options.linkedConfigNode] - Name of the config node to link to (if any).
 */
export async function generateNode({ nodeName, prefix, color, type = 'node', linkedConfigNode }) {
	const isConfigNode = type === 'config';
	const pascalName = toPascalCase(nodeName);

	let suffix = 'Node';
	if (isConfigNode) {
		if (!pascalName.endsWith('Config'))
			suffix = 'Config' + suffix;
	}
	const nodeClass = pascalName + suffix;

	let configEntry = '';
	let configRow = '';
	let propsType = "Omit<BaseNodeProps, 'config'>";

	if (linkedConfigNode) {
		configEntry = `config: { value: '', type: '${prefix}-${linkedConfigNode}', required: true },`;
		configRow = [
			'<div class="form-row">',
			'\t<label for="node-input-config">',
			'\t\t<i class="fa fa-globe"></i>',
			`\t\t<span data-i18n="${nodeName}.label.config"></span>`,
			'\t</label>',
			'\t<input type="text" id="node-input-config" />',
			'</div>'
		].join('\n');
		propsType = 'BaseNodeProps';
	}

	const replacements = {
		'__PREFIX__': prefix,
		'__NODE_NAME__': nodeName,
		'__NODE_CLASS__': nodeClass,
		'__COLOR__': color,
		'// __CONFIG_ENTRY__': configEntry,
		'<!-- __CONFIG_ROW__ -->': configRow,
		"Omit<BaseNodeProps, 'config'>": propsType
	};

	const templateDir = isConfigNode ? 'src/nodes/config' : 'src/nodes/node';

	await copyTemplate(`${templateDir}/runtime.js`, `src/nodes/${nodeName}/runtime.js`, replacements);
	await copyTemplate(`${templateDir}/ui.js`, `src/nodes/${nodeName}/ui.js`, replacements);
	await copyTemplate(`${templateDir}/template.html`, `src/nodes/${nodeName}/template.html`, replacements);

	const localeTemplate = isConfigNode ? 'src/locales/en-US/config-node.json' : 'src/locales/en-US/node.json';
	await copyTemplate(localeTemplate, `src/locales/en-US/${nodeName}.json`, replacements);

	if (!isConfigNode)
		await copyTemplate('docs/en-US/nodes/node.md', `docs/en-US/nodes/${nodeName}.md`, replacements);
}
