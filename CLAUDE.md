# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`@apiglot/cli` is the official command-line tool for Apiglot, an i18n platform. End users install it as a dev dependency in their app, configure it via `apiglot.config.js`, and use it to pull translations, generate TypeScript types for i18next, etc. The published `bin` is `dist/main.js`.

## Commands

```bash
pnpm dev               # Run the CLI from source via tsx-style direct ts execution
pnpm type-check        # tsc --noEmit (no test suite exists)
pnpm build             # Bundle to dist/ with tsup (esm, minified)
```

Publishing (see `_PUBLISH.md`): bump with `pnpm version patch|minor|major`, then `pnpm publish`. There is no test script.

## Architecture

### Entry point and command registration

`src/main.ts` is the CLI entry. It constructs a single `commander` `Command` and delegates registration to per-command modules in `src/commands/`. Each command module exports a `registerXxxCommand(app)` function that attaches its subcommands. New commands should follow this pattern rather than inlining logic in `main.ts`.

Top-level commands: `init`, `i18next`, `json`, `project`, `info`, `translate`.

### Config loading

End users have an `apiglot.config.js` (ESM, default export) in their project root containing `projectId`, `apiKey`, `projectInfo` (cached project metadata including `sourceLanguage`, `targetLanguages`, `namespaces`, `framework`), and optional `localesPath`. The config is loaded by resolving `process.cwd()/apiglot.config.js`, converting to a `file://` URL (required for dynamic import on Windows), and dynamically importing it.

Note: `loadConfig` is currently duplicated — both `src/main.ts` and `src/utils/index.ts` define it with module-level caching. Prefer the one in `@utils` when adding new code.

### API client

`api` in `src/utils/index.ts` is a frozen object with `get`/`post` methods that wrap `fetch`. Every call requires `options.bearerToken` (the user's API key from config) — the helpers throw if missing. The host comes from `APIGLOT_HOST` env var, defaulting to `https://api.apiglot.com`. Errors with JSON bodies attach the parsed payload as `error.json` for callers to inspect.

### Framework-aware behavior

`config.projectInfo.framework` is a string like `"solidjs+i18next"` or `"<framework>+i18next"`. Commands branch on it:
- `i18next types` generates plain i18next module augmentation by default, but a SolidJS-specific variant (`generateSolidI18nextTypes`) when the framework contains `solidjs+i18next` — this emits union types per namespace and augments `@apiglot/solidjs/i18next` instead of `i18next`.
- `json pull` checks `framework.endsWith('+i18next')` to suggest a sensible `localesPath` (e.g. `./public/locales`).

When adding framework-specific output, add another branch on `projectInfo.framework` rather than introducing a separate command.

### Path aliases

`tsconfig.json` defines `@/*` → `./src/*`, `@types` → `./src/types.ts`, `@utils` → `./src/utils/index.ts`, `@utils/*` → `./src/utils/*`. These are used throughout. Note: `tsup` (the bundler) does not automatically read tsconfig paths; if you add new aliases, verify the build still resolves them.

### TypeScript constraints

`erasableSyntaxOnly: true` is enabled — no `enum`s or `namespace`s; only syntax Node can natively erase at runtime. `strict: true`. Target is `es2022`, module is `NodeNext`.
