
export type Language = {
    id: string;
    code: string;
    name: string;
    base_language_id: string | null;
}

export type ProjectInfo = {
    projectName: string;
    framework: string;
    accountName: string;
    sourceLanguage: Language;
    targetLanguages: Language[];
    namespaces: string[];
    [key: string]: any; // Allow for additional properties
};

export type ApiglotConfig = {
    projectId: string;
    apiKey: string;
    projectInfo: {
        name: string;
        description?: string;
        version?: string;
        framework: string;
        languages?: Language[];
        [key: string]: any; // Allow for additional properties
    };
    [key: string]: any; // Allow for additional properties
}

export type Resource = {
    name: string;
    resources: Record<string, any>;
}