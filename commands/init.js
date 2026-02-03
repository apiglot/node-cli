import { input, password } from '@inquirer/prompts';
import { getProjectInfoFromRemote } from '../utils/index.js';


const configFileTemplate = `
// Apiglot configuration file

export default {
    projectId: '{{PROJECT_ID}}',
    apiKey: '{{API_KEY}}',
    projectInfo: {{PROJECT_INFO}}
};
`

function registerInitCommand(app) {
    app.command('init')
        .description('Creates a local configuration file for an Apiglot project')
        .action(async () => {
            const projectId = await input({ message: 'Enter your Apiglot Project ID' });
            const apiKey = await password({ message: 'Enter your Apiglot API Key' });
            const projectInfo = await getProjectInfoFromRemote(projectId, apiKey);
            console.log('Fetched project info:', projectInfo);
            const configFileContent = configFileTemplate
                .replace('{{PROJECT_ID}}', projectId)
                .replace('{{API_KEY}}', apiKey)
                .replace(
                    '{{PROJECT_INFO}}',
                    JSON.stringify(projectInfo, null, 4).replace(/"(\w+)"\s*:/g, '$1:')
                );

            
            const fs = await import('fs');
            fs.writeFileSync('apiglot.config.js', configFileContent.trim());
            console.log('Configuration file "apiglot.config.js" created successfully.');
        });
}

export { registerInitCommand };