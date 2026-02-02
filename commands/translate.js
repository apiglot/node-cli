import { loadConfig, listFiles, getFileInfo, api, getProjectInfo, sleep } from '../utils.js';
import path from 'path';
import AstroUtils from '../utils/astro.js';
import { isFileModified, getLastModified } from '../utils/git.js';
import chalk from 'chalk';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { v7 as uuid7 } from 'uuid';
import { performance } from 'perf_hooks';

const ASTRO_CONFIG_TEMPLATE = `
import { defineConfig } from 'astro/config';

export default defineConfig({
    i18n: {
        locales: [{TARGET_LOCALES}],
        defaultLocale: '{DEFAULT_LOCALE}',
    }
});
`

async function ensureDir(path) {
  try {
    await access(path);
    //console.log('Directory already exists');
  } catch {
    //console.log('Directory does not exist, creating it...');
    await mkdir(path, { recursive: true });
  }
}

const mainAction = async () => {

    // Check project info and astro config
    console.log("Loading project info...");
    const project = await getProjectInfo();
    const astroConfig = await AstroUtils.loadAstroConfig();
    //console.log('Loaded Astro Config:', astroConfig);
    if(!astroConfig.i18n){
        console.log(chalk.bgRed("Your Astro project does not seem to have i18n configured. Please set up internationalization before running translations."));
        console.log("According to your Apiglot project configuration, this is what your astro.config.mjs file should look like:");
        console.log(
            ASTRO_CONFIG_TEMPLATE
                .replace('{DEFAULT_LOCALE}', project.source_language.code)
                .replace('{TARGET_LOCALES}', [project.source_language].concat(project.target_languages).map(lang => `'${lang.code}'`).join(', '))
                
        );
        return;
    }
    const locales = [project.source_language].concat(project.target_languages);
    const localeMap = new Map(locales.map(lang => [lang.code, lang]));


   const config = await loadConfig();
   const curDir = path.resolve(process.cwd(), config.pagesDir || './src/pages')
   const files = await listFiles(curDir);
   const batch_id = uuid7()
   for(const file of files) {
       console.log(` - ${file.name} (${file.isFile() ? 'File' : 'Directory'})`);
       if (file.isFile() && file.name.endsWith('.astro')) {
        const filePath = path.join(config.pagesDir || './src/pages', file.name);
        const fileInfo = await getFileInfo(filePath);
        console.log(`Processing file for translation: ${file.name}...`);
        const content = await AstroUtils.extractRelevantContent(filePath);

        for(const localeCode of astroConfig.i18n.locales){
            if(localeCode === astroConfig.i18n.defaultLocale) continue;
            const locale = localeMap.get(localeCode);
            await ensureDir(path.join(curDir, locale.code.toLowerCase()));
            //console.log(chalk("Translating ", chalk.inverse(filePath), " to ", chalk.green(`${locale.code} (${locale.name})`), "..."));

            const _targetLang = `${locale.code} (${locale.name.replace("(", "- ").replace(")", "")})`;
            const _sourceLang = `${project.source_language.code} (${project.source_language.name.replace("(", "- ").replace(")", "")})`;
            console.log(chalk("Translating ", chalk.inverse(filePath), " from ", chalk.blue(_sourceLang), " to ", chalk.green(_targetLang), "..."));
            //console.log(chalk.blue(`Translating for locale: ${localeCode} (${locale ? locale.name : 'Unknown Language'})`));
            const last_modified = await getLastModified(filePath);
            const payload = {
                batch_id: batch_id,
                source_file: {
                    name: file.name,
                    size: fileInfo.size,
                    created: fileInfo.birthtime,
                    last_modified: last_modified.timestamp,
                    content: content.content,
                },
                source_language_id: project.source_language.id,
                target_language_id: locale.id
            };
            //console.log('Payload prepared:', payload);
            // post file content to translation API endpoint
            try {
                //console.log('Sending payload to translation API:', payload);
                const startTime = performance.now();
                const timer = setInterval(() => {
                    const elapsed = performance.now() - startTime;
                    process.stdout.write(
                        chalk(
                            "\rTranslating ",
                            chalk.inverse(filePath),
                            " from ",
                            chalk.blue(_sourceLang),
                            " to ",
                            chalk.green(_targetLang),
                            ` (${(elapsed / 1000.0).toFixed(1)}s)...\r`
                        )
                    );
                    process.stdout.write(chalk.yellow(`Elapsed time: ${elapsed}ms\n`));
                }, 1000);
                const response = await api.post(`/projects/${config.projectId}/translate`, payload);
                clearInterval(timer);
                console.log('Translation API Response:', response);

                const localizedFileContent = response.result.llm_output + content.removed.join('\n\n');
                const localizedFilePath = path.join(curDir, locale.code.toLowerCase(), file.name);
                await ensureDir(path.dirname(localizedFilePath));
                await writeFile(localizedFilePath, localizedFileContent);
                console.log(chalk.green(`Localized file saved to ${localizedFilePath}`));
                console.timeEnd(filePath)
                
            } catch (error) {
                console.error('Error during translation API call:', error);
                break;
            }

            await sleep(1000);
        }

        //console.log(content);
        return;

        console.log('Extracted Content:\n', content.split('\n').slice(0, 10).join('\n') + '\n...'); // Print first 10 lines

        
        console.log(last_modified);
        
       

        


        


           //const filePath = path.join(config.pagesDir || './src/pages', file.name);
           //await getFileInfo(filePath);
           // Here you can add logic to process the file for translation
       }
   }
}

export default mainAction;
