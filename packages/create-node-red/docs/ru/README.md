# create-node-red

🌐 [English](../../README.md) | [Русский](README.md)

[![npm][npm-badge]][npm-url]
[![license][license-badge]][license-url]

[npm-badge]: https://img.shields.io/npm/v/create-node-red
[npm-url]: https://www.npmjs.com/package/create-node-red
[license-badge]: https://img.shields.io/github/license/alex2844/node-red-builder
[license-url]: ../../../../LICENSE

CLI-обёртка над `nrb init` из [`node-red-builder`](../../../node-red-builder/docs/ru/README.md),
предназначенная для использования через `npm create` / `bunx`.
Требует [Bun](https://bun.sh).

---

## Использование

```bash
npm create node-red
npm create node-red my-nodes

bunx create-node-red
bunx create-node-red my-nodes
```

---

## Что создаётся

Вызывает `nrb init [projectDir]`, который генерирует:

- `package.json` со скриптами и пустой секцией `node-red.nodes`
- `tsconfig.json` для проверки типов TypeScript и JSDoc
- `node-red-builder.config.js`
- `.gitignore`

С флагом `--example` также генерируется узел-пример:

- `src/nodes/example/` — `runtime.js`, `ui.js`, `template.html`
- `src/locales/en-US/example.json`
- `docs/en-US/nodes/example.md`

`prefix` определяется автоматически из имени директории или из
корневого `package.json`, если проект находится в монорепозитории.
Префиксы `node-red-contrib-` и `node-red-` отсекаются.

Файлы, которые уже существуют, пропускаются.

---

## Сгенерированный `package.json`

```json
{
    "name": "node-red-contrib-<prefix>",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "test":    "tsc -p ./tsconfig.json",
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
        "@types/node-red": "^1.3.5",
        "node-red":         "^4.1.7",
        "node-red-builder": "^1.1.0",
        "typescript":       "^5.9.3"
    },
    "engines": { "node": ">=18.0.0" }
}
```

---

## Следующие шаги

```bash
cd my-nodes
npm install
npm run dev   # → http://localhost:3000
```

Добавить ещё ноды:

```bash
bunx nrb add my-sensor
```

---

## Опции

```text
npm create node-red [projectDir]

  projectDir   Целевая директория (необязательно, по умолчанию cwd)

  -h, --help
  -v, --version
```
