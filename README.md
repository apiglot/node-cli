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
