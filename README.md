# Apiglot CLI

The official CLI for Apiglot, with helpful commands to improve the i18n development experience.

# Installation

We recommend installing the Apiglot CLI as a development dependency:

```bash
pnpm add -D @apiglot/cli
```

# Quick start

## `init`

After installing the CLI, we recommend initializing its config file first. The `init` command will do that for you:

```bash
pnpm apiglot init
```

This command will prompt you for your Apiglot project ID and API key. You can generate API tokens in the Apiglot dashboard, on your project's settings page.

## `json`

The `json` command lets you manage translation files. Currently, it can be used to download translation files for each target language in your project into local directories, so you can either bundle them with your app or serve them from your project's `public` directory:

```bash
pnpm apiglot json pull
```

## `i18next`

The `i18next` command groups subcommands for projects using [i18next](https://www.i18next.com/).

### `i18next types`

Generates TypeScript type definitions for your translation keys, so that calls like `t('some.key')` are type-checked against the keys actually defined in your Apiglot project.

```bash
pnpm apiglot i18next types
```

By default, the generated files are written to `./src/@types/`. You can override the output directory with the `-p`/`--path` option:

```bash
pnpm apiglot i18next types --path ./src/types
```

The command produces two files in the target directory:

- `resources.d.ts` — types describing every namespace and its keys.
- `i18next.d.ts` — module augmentation that wires those resources into `i18next`'s `CustomTypeOptions` (or into `@apiglot/solidjs/i18next` for SolidJS projects).

Once these files are picked up by your `tsconfig.json`, your editor and `tsc` will autocomplete and validate translation keys.
