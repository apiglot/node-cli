import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import type { ApiglotConfig, ProjectInfo } from '@types';

var config: ApiglotConfig | null = null;

type RequestOptions = {
    bearerToken?: string;
    [key: string]: any;
}

export interface ApiClient {
    config: ApiglotConfig;
    getHost(): string;
    get<T = unknown>(relativePath: string, options?: RequestOptions): Promise<T>;
    post<T = unknown>(relativePath: string, body: any, options?: RequestOptions): Promise<T>;
}

export const buildApiClient = (config: ApiglotConfig) => Object.freeze({
    config,
    getHost(){
        return config.host || 'https://api.apiglot.com';
    },
    async get<T = unknown>(relativePath: string, options: RequestOptions = {}) {
        const bearerToken = config.apiKey || options.bearerToken;
        if(!bearerToken){
            throw new Error('Bearer token is required for API requests. Please provide it in the options or set it in the config file.');
        }
        const url = (new URL(relativePath, this.getHost())).toString();
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': (
                    bearerToken
                    ? `Bearer ${bearerToken}`
                    : undefined
                ) as string
            }
        });
        if (!response.ok) {
            // check for JSON content type
            if (response.headers.get('Content-Type') === 'application/json') {
                const errorData = await response.json();
                const error = new Error(`API request failed with status ${response.status}: ${errorData.error || response.statusText}`);
                (error as any).json = errorData;
                throw error;
            }
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        const json = await response.json();
        return json as T;
    },
    async post<T = unknown>(relativePath: string, body: any, options: RequestOptions = {}) {
        const bearerToken = config.apiKey || options.bearerToken;
        if(!bearerToken){
            throw new Error('Bearer token is required for API requests. Please provide it in the options or set it in the config file.');
        }
        const url = (new URL(relativePath, this.getHost())).toString();
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${bearerToken}`
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
        return json as T;
    }
} as ApiClient);


/**
 * @deprecated Use `buildApiClient` instead to create a client instance with custom configuration.
 * A simple API client for making GET and POST requests to the Apiglot API.
 * Uses the configuration loaded from the local config file.
 * 
 * @example
 */
export const api = Object.freeze({
    getHost(){
        return process.env.APIGLOT_HOST || 'https://api.apiglot.com';
    },
    async get<T = unknown>(relativePath: string, options: RequestOptions = {}) {
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
                ) as string
            }
        });
        if (!response.ok) {
            // check for JSON content type
            if (response.headers.get('Content-Type') === 'application/json') {
                const errorData = await response.json();
                const error = new Error(`API request failed with status ${response.status}: ${errorData.error || response.statusText}`);
                (error as any).json = errorData;
                throw error;
            }
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        const json = await response.json();
        return json as T;
    },
    async post<T = unknown>(relativePath: string, body: any, options: RequestOptions = {}) {
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
        return json as T;
    }
});


export async function loadConfig() : Promise<ApiglotConfig> {
  if(config !== null) return config;
  const fileName = 'apiglot.config.js';
  // 1. Resolve the absolute path to the user's current directory
  const configPath = path.resolve(process.cwd(), fileName);

  try {
    // 2. Convert path to a File URL (required for dynamic import on Windows)
    const fileUrl = pathToFileURL(configPath).href;
    
    // 3. Dynamically import the module
    const module : ApiglotConfig = await import(fileUrl);
    
    // 4. Return the default export or the whole module
    config = module.default || module;
    return config!;
  } catch (err) {
    if ((err as any).code === 'ERR_MODULE_NOT_FOUND') {
      console.log('No config file found, using defaults.');
      return {} as ApiglotConfig; // Return empty or default settings
    }
    throw err;
  }
}


export const getProjectInfo = async () => {
  const _config = await loadConfig();
  const result = await api.get(`/projects/${_config.projectId}/info`);
  return result as ProjectInfo;
};

export const listFiles = (directoryPath: string) => fs.readdir(directoryPath, { withFileTypes: true });

export const getFileInfo = async (filePath: string) => fs.stat(filePath);

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getProjectInfoFromRemote(
    projectId : string | null = null,
    apiKey: string | null = null,
    options: Record<string, any> = {}
) {
    let config = {} as ApiglotConfig;
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

    return result as ProjectInfo;
}
