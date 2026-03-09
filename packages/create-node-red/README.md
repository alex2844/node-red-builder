# create-node-red

🌐 [English](README.md) | [Русский](docs/ru/README.md)

[![npm][npm-badge]][npm-url]
[![license][license-badge]][license-url]

[npm-badge]: https://img.shields.io/npm/v/create-node-red
[npm-url]: https://www.npmjs.com/package/create-node-red
[license-badge]: https://img.shields.io/github/license/alex2844/node-red-builder
[license-url]: ../../LICENSE

A CLI wrapper around `nrb init` from
[`node-red-builder`](../node-red-builder/README.md), designed
for use with `npm create` / `bunx`. Requires
[Bun](https://bun.sh).

---

## Usage

```bash
npm create node-red
npm create node-red my-nodes

bunx create-node-red
bunx create-node-red my-nodes
```

---

## What it creates

Calls `nrb init [projectDir]`, which generates:

- `package.json` with `node-red.nodes` entries and scripts
- `node-red-builder.config.js`
- `src/nodes/example/` — `runtime.js`, `ui.js`, `template.html`
- `src/locales/en-US/example.json`
- `docs/en-US/nodes/example.md`
- `.gitignore`

The `prefix` is inferred from the directory name by stripping
`node-red-contrib-` and `node-red-` prefixes.

Files that already exist are skipped.

---

## Generated `package.json`

```json
{
    "name": "node-red-contrib-<prefix>",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "start":   "node-red-builder start",
        "dev":     "node-red-builder dev",
        "build":   "node-red-builder build",
        "prepack": "bun run build"
    },
    "node-red": {
        "version": ">=3.0.0",
        "nodes": { "example": "dist/nodes/example.js" }
    },
    "files": ["./dist/", "./examples/"],
    "devDependencies": {
        "node-red":         "latest",
        "node-red-builder": "latest"
    },
    "engines": { "node": ">=18.0.0" }
}
```

---

## Next steps

```bash
cd my-nodes
npm install
npm run dev   # → http://localhost:3000
```

To add more nodes:

```bash
bunx nrb add my-sensor
```

---

## Options

```text
npm create node-red [projectDir]

  projectDir   Target directory (optional, defaults to cwd)

  -h, --help
  -v, --version
```
