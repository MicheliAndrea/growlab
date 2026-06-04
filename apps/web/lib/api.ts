export * from "@growlab/openapi-client/src/generated/client";
export * from "@growlab/openapi-client/src/generated/model";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export function plantImageFileUrl(id: string) {
  return absoluteOrRelativeUrl(`/api/images/${id}/file`);
}

export function firmwareFileUrl(id: string) {
  return absoluteOrRelativeUrl(`/api/firmware/${id}/file`);
}

function absoluteOrRelativeUrl(path: string) {
  return apiBaseUrl ? new URL(path, apiBaseUrl).toString() : path;
}
