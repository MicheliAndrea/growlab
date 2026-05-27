export type GrowlabFetchOptions<TBody = unknown> = {
  url: string;
  method: string;
  params?: Record<string, unknown>;
  headers?: HeadersInit;
  data?: TBody;
  signal?: AbortSignal;
};

export async function growlabFetch<TResponse, TBody = unknown>(
  options: GrowlabFetchOptions<TBody>,
): Promise<TResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const url = new URL(options.url, baseUrl || "http://localhost");

  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(baseUrl ? url.toString() : `${url.pathname}${url.search}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.data === undefined ? undefined : JSON.stringify(options.data),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`GrowLab API request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
