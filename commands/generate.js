import { api, loadConfig } from "../utils/index.js";
import { mergeResourcesAsInterface  } from 'i18next-resources-for-ts'
import fs from 'fs/promises';
import path from 'node:path';

const I18NEXT_D_TS_TEMPLATE = `import Resources from './resources.d.ts';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: Resources;
  }
}`;

export async function registerGenerateCommand(app) {
    const generate = app.command('generate');

    generate.command('ts-types')
        .description('Generate TypeScript types for translation keys')
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
            for (const namespace of config.projectInfo?.namespaces || []) {
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
                    // Add your TypeScript generation logic here
                } catch (error) {
                    console.error('Error fetching translations:', error);
                }
            }
            const merged = mergeResourcesAsInterface(resources, {optimize: true});

            // write merged content to `resources.d.ts` file in the specified path
            const outputFilePath = path.join(outputDir, 'resources.d.ts');
            await fs.writeFile(outputFilePath, merged);

            // write I18NEXT_D_TS_TEMPLATE to `i18next.d.ts` file in the specified path
            const i18nextFilePath = path.join(outputDir, 'i18next.d.ts');
            await fs.writeFile(i18nextFilePath, I18NEXT_D_TS_TEMPLATE);
            
            console.log(`TypeScript types written to ${outputFilePath}`);
        });
}