# Node-RED Builder

🌐 [English](README.md) | [Русский](ru/README.md)

[![npm][npm-badge]][npm-url]
[![license][license-badge]][license-url]

[npm-badge]: https://img.shields.io/npm/v/node-red-builder
[npm-url]: https://www.npmjs.com/package/node-red-builder
[license-badge]: https://img.shields.io/github/license/alex2844/node-red-builder
[license-url]: ../LICENSE

A monorepo with tools for developing and publishing Node-RED nodes.
Requires [Bun](https://bun.sh).

| Package | Description |
|---|---|
| [`node-red-builder`][pkg-nrb] | CLI and runtime framework |
| [`create-node-red`][pkg-cnr] | Project scaffolding |

[pkg-nrb]: ../packages/node-red-builder/README.md
[pkg-cnr]: ../packages/create-node-red/README.md

---

## Quick Start

```bash
npm create node-red my-nodes
cd my-nodes
npm install
npm run dev   # → http://localhost:3000
```

---

## Project Structure

After scaffolding:

```text
my-nodes/
├── node-red-builder.config.js
├── package.json
├── src/
│   ├── nodes/
│   │   └── example/
│   │       ├── runtime.js       # Node.js runtime
│   │       ├── ui.js            # Browser editor logic
│   │       └── template.html    # Editor panel HTML
│   └── locales/
│       └── en-US/
│           └── example.json
└── docs/
    └── en-US/
        └── nodes/
            └── example.md
```

After `npm run build`:

```text
dist/
└── nodes/
    ├── example.js
    ├── example.html
    └── locales/
        └── en-US/
            ├── example.json
            └── example.html
```

---

## Available Scripts

The generated `package.json` includes:

```bash
npm run dev     build + start Node-RED + watch for changes
npm run start   start Node-RED (no build, no watch)
npm run build   build all nodes for production
npm test        run type checking with tsc
```

To add a new node to the project:

```bash
bunx nrb add my-sensor
bunx nrb add --type config
```

---

## Configuration

`node-red-builder.config.js`:

```js
export default {
    prefix: 'my',
    port: 3000,
    palette: {
        color: '#a6bbcf',
    },
    // srcDir: 'src',
    // distDir: 'dist',
    // docsDir: 'docs',
    // localesDir: 'src/locales',
};
```
