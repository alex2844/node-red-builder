# Node-RED Builder

🌐 [English](../README.md) | [Русский](README.md)

[![npm][npm-badge]][npm-url]
[![license][license-badge]][license-url]

[npm-badge]: https://img.shields.io/npm/v/node-red-builder
[npm-url]: https://www.npmjs.com/package/node-red-builder
[license-badge]: https://img.shields.io/github/license/alex2844/node-red-builder
[license-url]: ../../LICENSE

Монорепозиторий с инструментами для разработки и публикации нод
Node-RED. Требует [Bun](https://bun.sh).

| Пакет | Описание |
|---|---|
| [`node-red-builder`][pkg-nrb] | CLI и рантайм-фреймворк |
| [`create-node-red`][pkg-cnr] | Скаффолдинг проекта |

[pkg-nrb]: ../../packages/node-red-builder/docs/ru/README.md
[pkg-cnr]: ../../packages/create-node-red/docs/ru/README.md

---

## Быстрый старт

```bash
npm create node-red my-nodes
cd my-nodes
npm install
npm run dev   # → http://localhost:3000
```

---

## Структура проекта

После скаффолдинга:

```text
my-nodes/
├── node-red-builder.config.js
├── package.json
├── src/
│   ├── nodes/
│   │   └── example/
│   │       ├── runtime.js       # Рантайм (Node.js)
│   │       ├── ui.js            # Логика редактора (браузер)
│   │       └── template.html    # HTML-шаблон панели
│   └── locales/
│       └── en-US/
│           └── example.json
└── docs/
    └── en-US/
        └── nodes/
            └── example.md
```

После `npm run build`:

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

## Доступные скрипты

Сгенерированный `package.json` включает:

```bash
npm run dev     сборка + запуск Node-RED + слежение за изменениями
npm run start   запуск Node-RED (без сборки и слежения)
npm run build   сборка всех нод для продакшена
npm test        запуск проверки типов через tsc
```

Добавить новую ноду в проект:

```bash
bunx nrb add my-sensor
bunx nrb add --type config
```

---

## Конфигурация

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
