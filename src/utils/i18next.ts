import { ApiglotConfig } from "@types";
import type { ApiClient } from "@utils";

export type FetchKeysByNamespaceResponse = {
    totalKeys: number;
    keys: Record<string, string[]>
}

export const fetchKeysByNamespace = (api: ApiClient) => api.get<FetchKeysByNamespaceResponse>(`v1/${api.config.projectId}/keys`);
