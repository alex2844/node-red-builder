# node-red-builder

🌐 [English](../../README.md) | [Русский](README.md)

[![npm][npm-badge]][npm-url]
[![license][license-badge]][license-url]

[npm-badge]: https://img.shields.io/npm/v/node-red-builder
[npm-url]: https://www.npmjs.com/package/node-red-builder
[license-badge]: https://img.shields.io/github/license/alex2844/node-red-builder
[license-url]: ../../../../LICENSE

CLI и рантайм-фреймворк для разработки нод Node-RED. Предоставляет
бинарный файл `nrb` и базовые классы.

---

## CLI

Бинарный файл `nrb` доступен после установки пакета. Как правило,
вызывается через npm-скрипты (см. сгенерированный `package.json`
ниже) или через `bunx nrb`.

### `nrb init [projectDir]`

Создаёт новый проект в текущей директории или в `projectDir`.
Пропускает файлы, которые уже существуют.

Генерирует:

- `package.json` с секцией `node-red.nodes` и скриптами
- `node-red-builder.config.js`
- `src/nodes/example/` — `runtime.js`, `ui.js`, `template.html`
- `src/locales/en-US/example.json`
- `docs/en-US/nodes/example.md`
- `.gitignore`

`prefix` определяется из имени директории — убирает префиксы
`node-red-contrib-` и `node-red-`.

Эта команда вызывается внутренне из `create-node-red`.

---

### `nrb add <n>`

Добавляет новую ноду в существующий проект. Имя должно быть в
нижнем регистре, начинаться с буквы, содержать только буквы,
цифры и дефисы.

Создаёт:

- `src/nodes/<n>/runtime.js`
- `src/nodes/<n>/ui.js`
- `src/nodes/<n>/template.html`
- `src/locales/en-US/<n>.json`
- `docs/en-US/nodes/<n>.md`

Добавляет запись в `package.json`:

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

Для каждой директории в `src/nodes/`:

1. Бандлит `runtime.js` через Bun (target Node.js, минификация).
   Пакеты из `dependencies` помечаются как external.
2. Бандлит `ui.js` для браузера и собирает вместе с
   `template.html` в `dist/nodes/<n>.html`.
3. Копирует иконки из `src/nodes/<n>/icons/` если папка есть.
4. Копирует локали:
   `src/locales/<lang>/<n>.json` →
   `dist/nodes/locales/<lang>/<n>.json`
5. Конвертирует документацию:
   `docs/<lang>/nodes/<n>.md` →
   `dist/nodes/locales/<lang>/<n>.html`
   (H1 удаляется; остальные заголовки сдвигаются вниз)

---

### `nrb dev [--port <number>]`

Выполняет `nrb build`, запускает Node-RED, затем следит за
`src/`, `docs/`, `src/locales/` и конфигурационными файлами.
При изменениях пересобирает и перезапускает Node-RED
(дебаунс 300 мс).

Изменения `node-red-builder.config.js` или `package.json`
вызывают перезагрузку конфигурации перед пересборкой.

Порт по умолчанию — 3000.

---

### `nrb start [--port <number>]`

Настраивает dev-окружение и запускает Node-RED без сборки и
наблюдения.

При `SIGINT` / `SIGTERM`:

- Учётные данные сохраняются в `.cred.json`
- Потоки, сохранённые в библиотеке Node-RED, перемещаются в
  `examples/`

Порт по умолчанию — 3000.

---

## Dev-окружение

`nrb dev` и `nrb start` используют `.dev/` как пользовательскую
директорию Node-RED. При каждом запуске:

1. Создаёт `.dev/` если отсутствует.
2. Симлинкует `examples/` → `.dev/lib/flows` (если папка есть),
   чтобы потоки были доступны в библиотеке Node-RED.
3. Копирует `.cred.json` → `.dev/flows_cred.json`.
4. При первом запуске (нет `.dev/flows.json`) генерирует его,
   объединяя все `examples/*.json`, дедуплицируя tab ID.
5. Симлинкует текущий пакет в `.dev/node_modules/<n>`.

---

## Конфигурация

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

Все пути разрешаются относительно `process.cwd()`. Файл
необязателен; при его отсутствии используются значения по
умолчанию.

---

## Сгенерированный `package.json`

`nrb init` создаёт следующий `package.json`:

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

Импорт в `runtime.js` (сторона Node.js):

```js
import {
    BaseNode,
    BaseConfigNode,
    registerNode,
} from 'node-red-builder';
```

---

### `BaseNode`

Базовый класс для функциональных нод. Событие `input`
регистрируется только если `onInput` переопределён в подклассе.
Ошибки внутри `onInput` перехватываются, передаются в `done()`,
статус ноды становится красным автоматически.

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

#### Свойства

| Свойство | Тип | Описание |
|---|---|---|
| `RED` | `NodeAPI` | API Node-RED |
| `node` | `Node` | Экземпляр ноды Node-RED |
| `props` | `TProps` | Конфигурация из редактора |
| `config` | `TConfigNode \| undefined` | Конфиг-нода |
| `client` | inferred | Результат `config.getClient()` |

`client` выбрасывает ошибку, если конфиг-нода или клиент
недоступны.

#### `getProp(key, msg)`

Разрешает `props[key]` через `props[keyType]` используя
`RED.util.evaluateNodeProperty`. Поддерживает все стандартные
типы Node-RED typed input (`str`, `num`, `bool`, `json`, `msg`,
`flow`, `global`, `env`, `jsonata`, `cred`, …).

```js
const action = await this.getProp('action', msg);
```

#### `getProps(keys, msg)`

Разрешает несколько свойств параллельно. Возвращает
`Record<string, any>`.

```js
const { action, topic } = await this.getProps(
    ['action', 'topic'], msg,
);
```

#### `setStatus(text, fill?, shape?)`

Устанавливает статус-бейдж ноды. Текст обрезается до 32
символов. По умолчанию: `fill = 'green'`, `shape = 'dot'`.

#### `clearStatus(delay?)`

Очищает статус-бейдж немедленно или с задержкой `delay` мс.

#### Хуки жизненного цикла

| Метод | Когда вызывается |
|---|---|
| `onInput(msg, send)` | При получении сообщения |
| `onClose(removed)` | При закрытии ноды или перезапуске |

---

### `BaseConfigNode`

Базовый класс для конфигурационных нод.

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

Создаёт `new ClientClass(options)`, сохраняет и возвращает.
Если экземпляр генерирует событие `'auth'`, учётные данные
автоматически сохраняются через `RED.nodes.addCredentials`.

#### `getClient()`

Возвращает сохранённый клиент или `null`.

#### `registerRoute(method, path, handler, permission?)`

Регистрирует маршрут на `RED.httpAdmin` по адресу:

```text
/<namespace>/<nodeId><path>
```

`permission` по умолчанию `'read'`. Middleware авторизации
применяется автоматически. Возвращает полный путь.

При закрытии ноды все зарегистрированные маршруты удаляются
из роутера Express автоматически.

#### `namespace`

Определяется из `config.type` — всё до последнего `-`.
Например, `my-config` → `my`.

#### Хук жизненного цикла

Переопределите `onClose(removed)` для очистки ресурсов.
Слушатели событий клиента удаляются автоматически.

---

### `registerNode(RED, typeName, NodeClass, credentials?)`

Регистрирует класс ноды в Node-RED. Конструктор получает
`(node, config, RED)`. Экземпляр сохраняется в `node.instance`,
позволяя конфигурационным нодам предоставлять клиент через
`getClient()`.

```js
export default (RED) =>
    registerNode(RED, 'my-sensor', MySensorNode);

// с учётными данными:
export default (RED) =>
    registerNode(RED, 'my-config', MyConfigNode, {
        apiKey: { type: 'password' },
    });
```

---

## UI-хелперы

Импорт в `ui.js` (браузерная сторона):

```js
import {
    setupTypedInput,
    createTypedInputOptions,
} from 'node-red-builder/ui';
```

---

### `setupTypedInput(elementId, types?)`

Инициализирует виджет `typedInput` на `#<elementId>` и
связывает его со скрытым полем `#<elementId>Type`.

`types` по умолчанию `['str', 'msg', 'flow', 'global']`.

```js
setupTypedInput('node-input-topic');
setupTypedInput('node-input-value', ['str', 'num', 'msg']);
```

---

### `createTypedInputOptions(items, getLabel?)`

Конвертирует объект или массив в формат `options` для
определений типов `typedInput`.

Для объектов `getLabel(key, value)` получает ключ и значение.
Для массивов оба аргумента равны значению элемента.

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

## Типы

Файлы деклараций в `types/` (собраны из `src/` через `tsc`),
доступны через `exports`:

| Импорт | Типы |
|---|---|
| `node-red-builder` | `types/runtime/index.d.ts` |
| `node-red-builder/ui` | `types/ui/index.d.ts` |
| `node-red-builder/cli/<cmd>` | `types/cli/commands/<cmd>.d.ts` |
