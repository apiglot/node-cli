import { api, loadConfig } from "../utils/index.js";
import { mergeResourcesAsInterface } from 'i18next-resources-for-ts'
import fs from 'fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { input } from '@inquirer/prompts';
import type { Command } from "commander";


export async function registerJsonCommand(app: Command) {
    const jsonCmd = app.command('json');

    jsonCmd.description('Commands related to JSON translation files');

    jsonCmd.command('pull')
        .description('Pull JSON translations from the API and save them to the local filesystem')
        //.option('-p, --path <path>', 'Path to the generated types files', './src/@types/')
        .action(async (options) => {
            // make sure path exists. Create if it doesn't
            const config = await loadConfig();

            if (!config.localesPath) {
                // suggest a path based on the project framework. For example, if the project has a `src` folder, suggest `src/locales`. Otherwise, suggest `locales` in the root of the project.
                if (config.projectInfo.framework.endsWith('+i18next')) {

                    console.log(
                        chalk.yellow(`Please set 'localesPath' in your config file.\nBased on your project's i18n framework (i18next) we recommend setting it to `),
                        chalk.bgYellow(`./public/locales`)
                    );
                    console.log(`\nexport default {\n   projectId: '...',\n   apiKey: '...',\n   localesPath: './public/locales',\n   ...\n}`);
                    // const answer = await input({
                    //     message: 'Enter the path where you want to save the JSON translation files:',
                    //     default: './public/locales',
                    // });
                    // console.log('You entered:', answer);

                    return;
                }
                console.error(chalk.red('Error: `localesPath` is not defined in the config file. Please set it to the path where you want to save the JSON translation files.'));
                return;
            }

            console.log('Pulling JSON translations from the API to ', config.localesPath);
            const targetLanguages = [
                config.projectInfo.sourceLanguage,
                ...config.projectInfo.targetLanguages,
            ];

            let errors = 0;

            for (const lang of targetLanguages) {
                //console.log(chalk.blue(`Processing language: ${lang.code} (${lang.name})`));
                for (const ns of config.projectInfo.namespaces) {
                    //console.log(`Processing namespace: ${ns}`);
                    try {
                        const result = await api.get(`v1/${config.projectId}/${config.projectInfo.sourceLanguage.code}/${ns}?with_details=true`, {
                            bearerToken: config.apiKey,
                            namespace: ns,
                        });

                        const translations = result.translations || {};
                        // save to local file system under the path `${localesPath}/${lang.code}/${ns}.json`
                        
                        const jsonPath = `${config.localesPath}/${lang.code}/${ns}.json`;
                        await fs.mkdir(path.dirname(jsonPath), { recursive: true });
                        await fs.writeFile(jsonPath, JSON.stringify(translations, null, 4));

                        if(result.missingTranslations > 0 || result.outdatedTranslations > 0) {
                            errors += 1;
                            let errorMsg = "";
                            if(result.missingTranslations > 0) {
                                errorMsg += `${result.missingTranslations} keys have not been translated yet (translation jobs might be in progress)`;
                                if(result.outdatedTranslations > 0) {
                                    errorMsg += ` and ${result.outdatedTranslations} keys have outdated translations (source text has changed since they were last translated)`;
                                } else {
                                    errorMsg += `.`;
                                }
                            } else if(result.outdatedTranslations > 0) {
                                errorMsg += `${result.outdatedTranslations} keys have outdated translations (source text has changed since they were last translated).`;
                            }
                            console.warn(chalk.yellow(`Pulled '${lang.code}' (${lang.name}) translations for "${ns}" namespace with warnings: ${errorMsg}.`));
                        } else {
                            console.log(chalk.green(`Successfully pulled '${lang.code}' (${lang.name}) translations for "${ns}" namespace with no missing or outdated translations.`));
                        }

                    } catch (error: any) {
                        console.error(chalk.red(`Unexpected error when fetching '${lang.name}' translations for namespace '${ns}':`), error.json || error.message);
                    }
                }
            }

            if(errors > 0) {
                console.warn(chalk.yellow(`\nFinished pulling translations with ${errors} warnings. There might be translation jobs in progress. Please check the Apiglot dashboard for more details.`));
            }

            return;
            const outputDir = options.path.startsWith('/') ? options.path : path.join(process.cwd(), options.path);
            // check if path exists, if not create it
            try {
                await fs.access(outputDir);
            } catch {
                await fs.mkdir(outputDir, { recursive: true });
            }
        });
}