export * from "@growlab/openapi-client/src/generated/client";
export * from "@growlab/openapi-client/src/generated/model";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function plantImageFileUrl(id: string) {
  return new URL(`/api/images/${id}/file`, apiBaseUrl).toString();
}

export function firmwareFileUrl(id: string) {
  return new URL(`/api/firmware/${id}/file`, apiBaseUrl).toString();
}
