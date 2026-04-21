// Re-export from parent directory for convenience
export { api, apiGet, apiPost, apiPatch, apiDelete, getToken } from "../apiClient";

// Helper function to get axios-like instance
export function apiClient() {
  return {
    get: (path: string, config?: any) =>
      import("../apiClient").then(m => m.api(path, { method: "GET", ...config })),
    post: (path: string, data?: any, config?: any) =>
      import("../apiClient").then(m => m.api(path, { method: "POST", body: JSON.stringify(data), ...config })),
    patch: (path: string, data?: any, config?: any) =>
      import("../apiClient").then(m => m.api(path, { method: "PATCH", body: JSON.stringify(data), ...config })),
    delete: (path: string, config?: any) =>
      import("../apiClient").then(m => m.api(path, { method: "DELETE", ...config })),
  };
}
