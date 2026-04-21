const BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:3000/api";

export function getToken() {
  return localStorage.getItem("access_token");
}

function getBusinessId(): string | null {
  const raw = localStorage.getItem("current_business_id");
  if (!raw) return null;
  if (raw === "null" || raw === "undefined") return null;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

type ApiOptions = RequestInit & {
  headers?: Record<string, string> | Headers;
  query?: Record<string, string | number | boolean | null | undefined>;
};

function normalizeHeaders(h?: Record<string, string> | Headers) {
  if (!h) return {};
  if (h instanceof Headers) {
    const obj: Record<string, string> = {};
    h.forEach((v, k) => (obj[k] = v));
    return obj;
  }
  return h;
}

function buildUrl(path: string, query?: ApiOptions["query"]) {
  const url = new URL(`${BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = getToken();
  const businessId = getBusinessId();

  const extraHeaders = normalizeHeaders(options.headers);

  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(businessId ? { "x-business-id": businessId } : {}),
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
  };

  // ✅ IMPORTANT: use buildUrl (query support)
  const url = buildUrl(path, options.query);

  // DEBUG: Log request details
  if (path.includes('team-ai')) {
    console.log('\n📡 API REQUEST DEBUG:');
    console.log('  Path:', path);
    console.log('  URL:', url);
    console.log('  Token present:', token ? 'YES' : 'NO');
    console.log('  BusinessId present:', businessId ? 'YES' : 'NO');
    console.log('  Headers being sent:', headers);
    console.log('  Method:', options.method || 'GET');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // DEBUG: Log response details
  if (path.includes('team-ai')) {
    console.log('📡 API RESPONSE:');
    console.log('  Status:', res.status);
    console.log('  Status text:', res.statusText);
    console.log('  Headers:', Object.fromEntries(res.headers.entries()));
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let data: any = null;
  if (res.status !== 204) {
    try {
      data = isJson ? await res.json() : await res.text();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    if (data) {
      if (typeof data === "string") msg = data;
      else if (Array.isArray(data?.message)) msg = data.message.join(", ");
      else if (data?.message) msg = data.message;
      else if (data?.error) msg = data.error;
    }
    throw new Error(msg);
  }

  return (data ?? undefined) as T;
}

export const apiGet = <T>(path: string, query?: ApiOptions["query"]) =>
  api<T>(path, { method: "GET", query });

export const apiPost = <T>(path: string, body?: any) =>
  api<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const apiPatch = <T>(path: string, body?: any) =>
  api<T>(path, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" });