import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

var config = null;

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

export const api = Object.freeze({
    async get(relativePath) {
        const _config = await loadConfig();
        const url = (new URL(relativePath, _config.host ?? 'https://api.apiglot.com')).toString();
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${_config.apiKey}`
            }
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
    },
    async post(relativePath, body) {
        const _config = await loadConfig();
        const url = (new URL(relativePath, _config.host ?? 'https://api.apiglot.com')).toString();
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${_config.apiKey}`
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

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
