import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

var config = null;

/**
 * A simple API client for making GET and POST requests to the Apiglot API.
 * Uses the configuration loaded from the local config file.
 * 
 * @example
 */
export const api = Object.freeze({
    getHost(){
        return process.env.APIGLOT_HOST || 'https://api.apiglot.com';
    },
    async get(relativePath, options = {}) {
        if(!options.bearerToken){
            throw new Error('Bearer token is required for API requests. Please provide it in the options or set it in the config file.');
        }
        const url = (new URL(relativePath, this.getHost())).toString();
        const bearerToken = options.bearerToken
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': (
                    bearerToken
                    ? `Bearer ${bearerToken}`
                    : undefined
                )
            }
        });
        if (!response.ok) {
            // check for JSON content type
            if (response.headers.get('Content-Type') === 'application/json') {
                const errorData = await response.json();
                const error = new Error(`API request failed with status ${response.status}: ${errorData.error || response.statusText}`);
                error.json = errorData;
                throw error;
            }
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        const json = await response.json();
        return json;
    },
    async post(relativePath, body, options = {}) {
        if(!options.bearerToken){
            throw new Error('Bearer token is required for API requests. Please provide it in the options or set it in the config file.');
        }
        const url = (new URL(relativePath, this.getHost())).toString();
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${options.bearerToken}`
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            // check for JSON content type
            if (response.headers.get('Content-Type') === 'application/json') {
                const errorData = await response.json();
                console.log('Error Data:', errorData);
                throw new Error(`API request failed with status ${response.status}: ${errorData.error || response.statusText}`);
            }
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        const json = await response.json();
        return json;
    }
});

/**
 * @typedef {Object} Language
 * @property {string} id - The unique identifier for the language
 * @property {string} code - The language code (e.g., 'en' for English)
 * @property {string} name - The human-readable name of the language
 * @property {string|null} base_language_id - The ID of the base language if this is a derived language, otherwise null
 */

// ProjectInfo type definition
/**
 * @typedef {Object} ProjectInfo
 * @property {string} projectName - The name of the project
 * @property {string} framework - The tech stack/framework used in the project (e.g., 'react+i18next')
 * @property {Language} sourceLanguage - The source language for the project
 * @property {Language[]} targetLanguages - An array of Language objects representing the target languages in the project
 * @property {string[]} namespaces - An array of namespaces used in the project
 */

/**
 * @typedef {Object} ApiglotConfig
 * @property {string} projectId - The ID of the Apiglot project
 * @property {string} apiKey - The API key for authenticating with the Apiglot API
 * @property {ProjectInfo} projectInfo - Additional information about the project, such as namespaces and source language
 * @property {string} [localesPath] - Optional path to the local translations directory
 */

/**
 * 
 * @returns {Promise<ApiglotConfig>}
 */
export async function loadConfig() {
  if(config !== null) return config;
  const fileName = 'apiglot.config.js';
  // 1. Resolve the absolute path to the user's current directory
  const configPath = path.resolve(process.cwd(), fileName);

  try {
    // 2. Convert path to a File URL (required for dynamic import on Windows)
    const fileUrl = pathToFileURL(configPath).href;
    
    // 3. Dynamically import the module
    const module = await import(fileUrl);
    
    // 4. Return the default export or the whole module
    config = module.default || module;
    return config;
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('No config file found, using defaults.');
      return {}; // Return empty or default settings
    }
    throw err;
  }
}

/**
 * @returns {Promise<ProjectInfo>}
 */
export const getProjectInfo = async () => {
  const _config = await loadConfig();
  const result = await api.get(`/projects/${_config.projectId}/info`);
  return result;
};

export const listFiles = (directoryPath) => fs.readdir(directoryPath, { withFileTypes: true });

export const getFileInfo = async (filePath) => fs.stat(filePath);

// export async function getFileInfo(filePath) {
//   try {
//     const stats = await fs.stat(filePath);

//     console.log(`File: ${filePath}`);
//     console.log(`Size: ${stats.size} bytes`);
//     console.log(`Last Modified: ${stats.mtime}`);
//     console.log(`Created: ${stats.birthtime}`);
    
//     // You can also perform checks
//     if (stats.isFile()) {
//       console.log('This is a file.');
//     }
//   } catch (err) {
//     console.error('Error retrieving file stats:', err);
//   }
// }



export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function getProjectInfoFromRemote(projectId = null, apiKey = null, options = {}) {
    let config = {};
    if (!projectId || !apiKey) {
        config = await loadConfig();
    }
    const optionsWithDefaults = {
        projectId: projectId || config.projectId,
        apiKey: apiKey || config.apiKey,
        ...options
    }

    const result = await api.get(`/v1/${optionsWithDefaults.projectId}/info`, {
        bearerToken: optionsWithDefaults.apiKey
    });

    return result;
}
