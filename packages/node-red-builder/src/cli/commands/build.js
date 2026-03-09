import path from 'path';
import { rm, mkdir, readdir, readFile } from 'fs/promises';
import { dirExists } from '../utils.js';

function transformMarkdownForNodeRed(/** @type {string} */ markdown) {
	let content = markdown.replace(/^\s*#\s+.+(\r?\n|$)/, '');
	content = content.replace(/^(#{2,})/gm, '#$1');
	return content.trim();
}

async function getRuntimeExternals() {
	const pkgPath = path.join(process.cwd(), 'package.json');
	try {
		const raw = await readFile(pkgPath, 'utf8');
		const pkg = JSON.parse(raw);
		return Object.keys(pkg.dependencies ?? {});
	} catch {
		return [];
	}
}

export async function build(/** @type {import('../config.js').BuilderConfig} */ config) {
	console.time('✨ Build complete');
	console.log(`📦 Using node prefix: "${config.prefix}"`);

	await rm(config.distDir, { recursive: true, force: true });
	console.log(`🧹 Cleaned ${config.distDir} directory.`);

	const distNodesDir = path.join(config.distDir, 'nodes');
	await mkdir(distNodesDir, { recursive: true });

	const nodesSrcDir = path.join(config.srcDir, 'nodes');
	if (!(await dirExists(nodesSrcDir))) {
		console.warn(`⚠️  Source directory not found at ${nodesSrcDir}. Nothing to build.`);
		return;
	}

	const nodeDirEntries = await readdir(nodesSrcDir, { withFileTypes: true });
	const nodeNames = nodeDirEntries
		.filter(dirent => dirent.isDirectory())
		.map(dirent => dirent.name);

	if (nodeNames.length === 0) {
		console.log('🤷 No nodes found to build.');
		return;
	}

	console.log(`🔍 Found ${nodeNames.length} node(s): ${nodeNames.join(', ')}`);

	const externalPackages = await getRuntimeExternals();
	if (externalPackages.length > 0)
		console.log(`📎 External packages (from dependencies): ${externalPackages.join(', ')}`);

	async function buildNode(/** @type {string} */ nodeName) {
		const nodeSrcDir = path.join(nodesSrcDir, nodeName);
		const nodeDistDir = distNodesDir;

		// 1. JS Runtime
		const runtimeSrc = path.join(nodeSrcDir, 'runtime.js');
		if (await Bun.file(runtimeSrc).exists()) {
			const buildResult = await Bun.build({
				entrypoints: [runtimeSrc],
				outdir: nodeDistDir,
				naming: `${nodeName}.js`,
				external: externalPackages,
				target: 'node',
				minify: true
			});
			if (buildResult.success)
				console.log(`✅ Built ${nodeName}.js`);
			else
				console.error(`❌ Build failed for ${nodeName}.js:`, buildResult.logs);
		}

		// 2. HTML UI
		const finalHtmlParts = [];
		const uiSrc = path.join(nodeSrcDir, 'ui.js');
		if (await Bun.file(uiSrc).exists()) {
			const buildResult = await Bun.build({
				entrypoints: [uiSrc],
				target: 'browser',
				minify: { syntax: true, whitespace: true }
			});
			if (buildResult.success) {
				const [artifact] = buildResult.outputs;
				const content = await artifact.text();
				finalHtmlParts.push(`<script type="text/javascript">\n${content}</script>`);
			} else
				console.error(`❌ Build failed for ${nodeName}/ui.js:`, buildResult.logs);
		}

		const templateSrc = path.join(nodeSrcDir, 'template.html');
		if (await Bun.file(templateSrc).exists()) {
			const content = await Bun.file(templateSrc).text();
			finalHtmlParts.push(`<script type="text/html" data-template-name="${config.prefix}-${nodeName}">\n${content}</script>`);
		}

		if (finalHtmlParts.length > 0) {
			const htmlDest = path.join(nodeDistDir, `${nodeName}.html`);
			await Bun.write(htmlDest, finalHtmlParts.join('\n\n'));
			console.log(`📦 Assembled ${nodeName}.html`);
		}

		// 3. Icons
		const iconSrcDir = path.join(nodeSrcDir, 'icons');
		if (await dirExists(iconSrcDir)) {
			const iconDistDir = path.join(nodeDistDir, 'icons');
			await mkdir(iconDistDir, { recursive: true });
			const glob = new Bun.Glob('*');
			for await (const file of glob.scan({ cwd: iconSrcDir })) {
				await Bun.write(path.join(iconDistDir, file), Bun.file(path.join(iconSrcDir, file)));
			}
			console.log(`🎨 Copied icons for ${nodeName}`);
		}
	}

	async function copyDocsAndLocales(/** @type {'docs'|'locales'} */ type, /** @type {string} */ srcDir) {
		if (!(await dirExists(srcDir)))
			return;

		let copied = false;
		const langDirEntries = await readdir(srcDir, { withFileTypes: true });
		for (const dirent of langDirEntries) {
			if (!dirent.isDirectory())
				continue;
			const lang = dirent.name;
			const localeDistDir = path.join(config.distDir, 'nodes', 'locales', lang);
			for (const nodeName of nodeNames) {
				const srcFile = type === 'docs' ? path.join(srcDir, lang, 'nodes', `${nodeName}.md`) : path.join(srcDir, lang, `${nodeName}.json`);
				if (await Bun.file(srcFile).exists()) {
					await mkdir(localeDistDir, { recursive: true });
					if (type === 'docs') {
						const dest = path.join(localeDistDir, `${nodeName}.html`);
						const content = transformMarkdownForNodeRed(await Bun.file(srcFile).text());
						await Bun.write(dest, `<script type="text/markdown" data-help-name="${config.prefix}-${nodeName}" data-lang="${lang}">\n${content}\n</script>`);
					} else {
						const dest = path.join(localeDistDir, `${nodeName}.json`);
						await Bun.write(dest, Bun.file(srcFile));
					}
					copied = true;
				}
			}
		}
		if (copied)
			console.log(`🌍 Copied ${type} files.`);
	}

	await Promise.all([
		...nodeNames.map(buildNode),
		copyDocsAndLocales('docs', config.docsDir),
		copyDocsAndLocales('locales', config.localesDir)
	]);

	console.timeEnd('✨ Build complete');
}
