# node-red-builder

🌐 [English](README.md) | [Русский](docs/ru/README.md)

[![npm][npm-badge]][npm-url]
[![license][license-badge]][license-url]

[npm-badge]: https://img.shields.io/npm/v/node-red-builder
[npm-url]: https://www.npmjs.com/package/node-red-builder
[license-badge]: https://img.shields.io/github/license/alex2844/node-red-builder
[license-url]: ../../LICENSE

CLI and runtime framework for building Node-RED nodes.
Exposes the `nrb` binary and provides base classes for node
development.

---

## CLI

The `nrb` binary is available after installing the package.
It is typically invoked via npm scripts (see generated
`package.json` below) or with `bunx nrb`.

### `nrb init [projectDir]`

Scaffolds a new project in the current directory or in
`projectDir` if specified. Skips files that already exist.

Generates:

- `package.json` with `node-red.nodes` entries and scripts
- `node-red-builder.config.js`
- `src/nodes/example/` — `runtime.js`, `ui.js`, `template.html`
- `src/locales/en-US/example.json`
- `docs/en-US/nodes/example.md`
- `.gitignore`

The `prefix` is inferred from the directory name by stripping
`node-red-contrib-` and `node-red-` prefixes.

This command is called internally by `create-node-red`.

---

### `nrb add <n>`

Adds a new node to an existing project. The name must be
lowercase, start with a letter, and contain only letters,
numbers, and hyphens.

Creates:

- `src/nodes/<n>/runtime.js`
- `src/nodes/<n>/ui.js`
- `src/nodes/<n>/template.html`
- `src/locales/en-US/<n>.json`
- `docs/en-US/nodes/<n>.md`

Also adds the entry to `package.json`:

```json
"node-red": {
    "nodes": { "<n>": "dist/nodes/<n>.js" }
}
```

```bash
bunx nrb add temperature-sensor
```

---

### `nrb build`

For each directory found in `src/nodes/`:

1. Bundles `runtime.js` with Bun (Node.js target, minified).
   Packages listed in `dependencies` are marked as external.
2. Bundles `ui.js` for the browser and assembles it together
   with `template.html` into a single `dist/nodes/<n>.html`.
3. Copies icons from `src/nodes/<n>/icons/` if the directory
   exists.
4. Copies locale files:
   `src/locales/<lang>/<n>.json` →
   `dist/nodes/locales/<lang>/<n>.json`
5. Converts help docs:
   `docs/<lang>/nodes/<n>.md` →
   `dist/nodes/locales/<lang>/<n>.html`
   (H1 is stripped; remaining headings shift down one level)

---

### `nrb dev [--port <number>]`

Runs `nrb build`, starts Node-RED, then watches `src/`,
`docs/`, `src/locales/`, and config files for changes.
On any change, rebuilds and restarts Node-RED (debounced
at 300 ms).

Config file changes (`node-red-builder.config.js`,
`package.json`) cause the config to reload before rebuilding.

The default port is 3000.

---

### `nrb start [--port <number>]`

Sets up the dev environment and starts Node-RED without
building or watching.

On `SIGINT` / `SIGTERM`:

- Credentials are saved to `.cred.json`
- Flows saved in the Node-RED library are moved to `examples/`

The default port is 3000.

---

## Dev Environment

Both `nrb dev` and `nrb start` use `.dev/` as the Node-RED
user directory. On each start:

1. Creates `.dev/` if absent.
2. Symlinks `examples/` → `.dev/lib/flows` (if it exists),
   making example flows available in the Node-RED library.
3. Copies `.cred.json` → `.dev/flows_cred.json`.
4. On first run (no `.dev/flows.json` yet), generates it by
   merging all `examples/*.json` files, deduplicating tab IDs.
5. Symlinks the current package into
   `.dev/node_modules/<name>`.

---

## Configuration

`node-red-builder.config.js` (ESM, default export):

```js
export default {
    prefix: 'my',
    port: 3000,
    srcDir: 'src',
    distDir: 'dist',
    docsDir: 'docs',
    localesDir: 'src/locales',
};
```

All paths are resolved relative to `process.cwd()`. The file
is optional; defaults are used if absent.

---

## Generated `package.json`

`nrb init` generates the following `package.json`:

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

## Runtime API

Import in `runtime.js` (Node.js side):

```js
import {
    BaseNode,
    BaseConfigNode,
    registerNode,
} from 'node-red-builder';
```

---

### `BaseNode`

Base class for functional nodes. The `input` event is only
registered if `onInput` is overridden in the subclass.
Errors thrown inside `onInput` are caught, passed to `done()`,
and the node status is set to red automatically.

```js
/** @import { NodeMessage } from 'node-red' */
/** @import { NodeProps as BaseProps } from 'node-red-builder' */

/**
 * @typedef {BaseProps & {
 *   action: string,
 *   actionType: string,
 * }} NodeProps
 */

/** @extends {BaseNode<NodeProps>} */
export class MyNode extends BaseNode {
    /** @param {NodeMessage} msg */
    async onInput(msg, send) {
        const action = await this.getProp('action', msg);
        msg.payload = action;
        send(msg);
        this.setStatus('ok', 'green');
        this.clearStatus(1_500);
    }

    async onClose(removed) {}
}

export default (RED) => registerNode(RED, 'my-node', MyNode);
```

#### Properties

| Property | Type | Description |
|---|---|---|
| `RED` | `NodeAPI` | Node-RED API |
| `node` | `Node` | The Node-RED node instance |
| `props` | `TProps` | Node configuration from the editor |
| `config` | `TConfigNode \| undefined` | Linked config node |
| `client` | inferred | `config.getClient()` shortcut |

`client` throws if the config node or its client is
unavailable.

#### `getProp(key, msg)`

Resolves `props[key]` using `props[keyType]` via
`RED.util.evaluateNodeProperty`. Supports all standard
Node-RED typed input types (`str`, `num`, `bool`, `json`,
`msg`, `flow`, `global`, `env`, `jsonata`, `cred`, …).

```js
const action = await this.getProp('action', msg);
```

#### `getProps(keys, msg)`

Resolves multiple properties in parallel. Returns
`Record<string, any>`.

```js
const { action, topic } = await this.getProps(
    ['action', 'topic'], msg,
);
```

#### `setStatus(text, fill?, shape?)`

Sets the node status badge. Text is truncated to 32 chars.
Defaults: `fill = 'green'`, `shape = 'dot'`.

#### `clearStatus(delay?)`

Clears the status badge immediately or after `delay` ms.

#### Lifecycle hooks

| Method | Called when |
|---|---|
| `onInput(msg, send)` | A message arrives |
| `onClose(removed)` | Node closes or Node-RED restarts |

---

### `BaseConfigNode`

Base class for configuration nodes.

```js
/** @extends {BaseConfigNode<ConfigNodeDef, Credentials, MyClient>} */
export class MyConfigNode extends BaseConfigNode {
    constructor(node, config, RED) {
        super(node, config, RED);
        this.initClient(MyClient, {
            token: node.credentials.token,
        });
        this.registerRoute('get', '/status', (req, res) => {
            res.json({ ok: true });
        });
    }

    async onClose(removed) {}
}

export default (RED) =>
    registerNode(RED, 'my-config', MyConfigNode, {
        token: { type: 'password' },
    });
```

#### `initClient(ClientClass, options)`

Creates `new ClientClass(options)`, stores it, returns it.
If the instance emits an `'auth'` event, credentials are
saved automatically via `RED.nodes.addCredentials`.

#### `getClient()`

Returns the stored client or `null`.

#### `registerRoute(method, path, handler, permission?)`

Registers a route on `RED.httpAdmin` at:

```text
/<namespace>/<nodeId><path>
```

`permission` defaults to `'read'`. Auth middleware is applied
automatically. Returns the full path string.

On node close, all registered routes are removed from the
Express router automatically.

#### `namespace`

Derived from `config.type` — everything before the last `-`.
For example, `my-config` → `my`.

#### Lifecycle hook

Override `onClose(removed)` for teardown. Client event
listeners are removed automatically.

---

### `registerNode(RED, typeName, NodeClass, credentials?)`

Registers a class-based node with Node-RED. The constructor
receives `(node, config, RED)`. The instance is stored on
`node.instance`, allowing config nodes to expose their client
to dependent nodes via `getClient()`.

```js
export default (RED) =>
    registerNode(RED, 'my-sensor', MySensorNode);

// with credentials:
export default (RED) =>
    registerNode(RED, 'my-config', MyConfigNode, {
        apiKey: { type: 'password' },
    });
```

---

## UI Helpers

Import in `ui.js` (browser side):

```js
import {
    setupTypedInput,
    createTypedInputOptions,
} from 'node-red-builder/ui';
```

---

### `setupTypedInput(elementId, types?)`

Initialises a `typedInput` widget on `#<elementId>` and wires
it to the hidden `#<elementId>Type` field.

`types` defaults to `['str', 'msg', 'flow', 'global']`.

```js
setupTypedInput('node-input-topic');
setupTypedInput('node-input-value', ['str', 'num', 'msg']);
```

---

### `createTypedInputOptions(items, getLabel?)`

Converts an object or array to the `options` format used by
`typedInput` type definitions.

For objects, `getLabel(key, value)` receives the object key
and value. For arrays, both arguments receive the item value.

```js
const ACTION = { APPLY: 'apply', RESTART: 'restart' };

setupTypedInput('node-input-action', [{
    value: 'action',
    options: createTypedInputOptions(ACTION, (key) =>
        this._(`node.action.${key.toLowerCase()}`),
    ),
}, 'str', 'msg']);
```

---

## Types

Declaration files are in `types/` (built from `src/` via
`tsc`), exposed via `exports`:

| Import | Types |
|---|---|
| `node-red-builder` | `types/runtime/index.d.ts` |
| `node-red-builder/ui` | `types/ui/index.d.ts` |
| `node-red-builder/cli/<cmd>` | `types/cli/commands/<cmd>.d.ts` |
