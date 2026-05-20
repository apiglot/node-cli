import { api, loadConfig, getProjectInfoFromRemote } from "@utils";
import { mergeResourcesAsInterface  } from 'i18next-resources-for-ts'
import fs from 'fs/promises';
import path from 'node:path';
import { type Resource } from "@types";
import type { Command  } from "commander"

const I18NEXT_D_TS_TEMPLATE = `import type Resources from './resources.d.ts';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: Resources;
  }
}`;

const SOLIDJS_I18NEXT_D_TS_TEMPLATE = `import type {
%TYPES_TO_IMPORT%
} from "./resources"

declare module '@apiglot/solidjs/i18next' {
  interface Resources {
%RESOURCES_INTERFACE_CONTENT%
  }
}`

const buildUnionType = (typeName: string, values: string[]) => `export type ${typeName} = \n${values.map(val => `\t| "${val}"`).join('\n')};\n`;

const toCamelCase = (str: string) => str.split(/[-_ ]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

/**
 * Register the i18next command and its subcommands
 * @param {*} app `commander` instance
 */
export async function registerI18nextCommand(app: Command) {
    const i18next = app.command('i18next');

    i18next.description('Commands related to i18next-based projects');

    i18next.command('types')
        .description('Generate TypeScript types for translation keys in a i18next-based project')
        .option('-p, --path <path>', 'Path to the generated types files', './src/@types/')
        .action(async (options) => {
            // make sure path exists. Create if it doesn't
            const outputDir = options.path.startsWith('/') ? options.path : path.join(process.cwd(), options.path);
            // check if path exists, if not create it
            try {
                await fs.access(outputDir);
            } catch {
                await fs.mkdir(outputDir, {recursive: true});
            }

            const config = await loadConfig();
            console.log('Generating TypeScript types for project:', config.projectInfo?.projectName || 'Unnamed Project');
            const resources = [];
            const projectInfo = await getProjectInfoFromRemote();

            for (const namespace of projectInfo?.namespaces || []) {
                console.log(`Processing namespace: ${namespace}`);
                try {
                    const translations = await api.get(`v1/${config.projectId}/${config.projectInfo.sourceLanguage.code}/${namespace}`, {
                        bearerToken: config.apiKey,
                        namespace: namespace,
                    });
                    resources.push({
                        name: namespace,
                        resources: translations,
                    });
                } catch (error) {
                    console.error('Error fetching translations:', error);
                }
            }

            if(projectInfo.framework.includes("solidjs+i18next")) {
                await generateSolidI18nextTypes(resources, outputDir);
            } else {
                const merged = mergeResourcesAsInterface(resources, {optimize: true});

                // write merged content to `resources.d.ts` file in the specified path
                const outputFilePath = path.join(outputDir, 'resources.d.ts');
                await fs.writeFile(outputFilePath, merged);

                // write I18NEXT_D_TS_TEMPLATE to `i18next.d.ts` file in the specified path
                const i18nextFilePath = path.join(outputDir, 'i18next.d.ts');
                await fs.writeFile(i18nextFilePath, I18NEXT_D_TS_TEMPLATE);
                
                console.log(`TypeScript types written to ${outputFilePath}`);
            }
        });
}

async function generateSolidI18nextTypes(resources: Resource[], outputDir: string) {
    const keys = [] as string[];
    let output = buildUnionType('Namespace', resources.map(r => r.name));
    const typeMap = {} as Record<string, string>;
    for(const res of resources) {
        const namespace = res.name;
        const translations = res.resources;
        const nsKeys = getNestedKeys(translations);
        output += `\n\n// Keys for namespace: ${namespace}\n`;
        typeMap[namespace] = `TranslationKey_${toCamelCase(namespace)}`;
        output += buildUnionType(typeMap[namespace], nsKeys);
    }

    // Finally, define `Resources` type that maps namespaces to their respective keys
    output += `\n\nexport type Resources = {\n`;
    for(const ns in typeMap) {
        output += `\t${ns}: ${typeMap[ns]}\n`;
    }
    output += `};\n`;

    const outputFilePath = path.join(outputDir, 'resources.d.ts');
    await fs.writeFile(outputFilePath, output);

    // Now generate the `i18next.d.ts` file that imports the `Resources` type
    const i18nextOutput = SOLIDJS_I18NEXT_D_TS_TEMPLATE
        .replace('%TYPES_TO_IMPORT%', Object.values(typeMap).sort().map(type => `\t${type}`).join(',\n'))
        .replace('%RESOURCES_INTERFACE_CONTENT%', Object.entries(typeMap).sort(([a], [b]) => a.localeCompare(b)).map(([ns, type]) => `\t\t${ns}: ${type};`).join('\n'));
    const i18nextFilePath = path.join(outputDir, 'i18next.d.ts');
    await fs.writeFile(i18nextFilePath, i18nextOutput);

    console.log(`SolidJS i18next types written to ${outputFilePath}`);
}

function getNestedKeys(obj: Record<string, string | Record<string, any>>, prefix = ''){
    const keys = [] as string[];
    for(const key in obj) {
        if(typeof obj[key] === "string") {
            keys.push(prefix ? `${prefix}.${key}` : key);
        } else if(typeof obj[key] === "object" && obj[key] !== null) {
            keys.push(...getNestedKeys(obj[key], prefix ? `${prefix}.${key}` : key));
        }
    }
    return keys;
};

