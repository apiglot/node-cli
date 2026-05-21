# Common Typescript types

Types shared across the project are define @src/types.ts. Path is aliased as `@types`. Example import: `import { ApiglotConfig } from "@types";`

# Base utilities

Common utilities are defined in @src/utils/index.ts. Path is aliased as `@utils`. Example import: `import { fetchKeysOnly } from "@utils/i18next";`

More specific utilities are defined in their own files, e.g. @src/utils/i18next.ts. Import using the following pattern: `import { fetchKeysOnly } from "@utils/i18next";`
