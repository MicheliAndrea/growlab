export type GrowlabFetchResponse<TData = unknown> = {
  data: TData;
  status: number;
  headers: Headers;
};

export async function growlabFetch<TResponse>(
  input: string,
  init?: RequestInit,
): Promise<TResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const url = baseUrl ? new URL(input, baseUrl).toString() : input;
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = isFormData
    ? init?.headers
    : {
        "Content-Type": "application/json",
        ...init?.headers,
      };

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data =
    response.status === 204
      ? undefined
      : contentType.includes("application/json")
        ? await response.json()
        : contentType.includes("application/octet-stream")
          ? await response.blob()
          : await response.text();

  return {
    data,
    status: response.status,
    headers: response.headers,
  } as TResponse;
}
