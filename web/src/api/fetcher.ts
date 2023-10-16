// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { t } from 'i18next';

export class HttpClientError extends Error {
  constructor(public statusCode: number, e?: string) {
    super(e);
  }
}

export class PermissionError extends HttpClientError {
  constructor(public statusCode: number, e?: string) {
    super(statusCode, e);
  }
}

export async function fetchAPI(method: string, uri: string, params?: any, token?: string, controller?: AbortController): Promise<any> {
  let headers = {
    Accept: "application/json",
  } as any;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (params) headers["Content-Type"] = "application/json";
  const res = await fetch(uri, {
    method,
    headers,
    body: params ? JSON.stringify(params) : undefined,
    signal: controller?.signal ?? undefined,
  });
  if (!res.ok) {
    if(res.status === 401) throw new HttpClientError(res.status, t('api.error.unauthenticated'));
    if(res.status === 403) throw new PermissionError(res.status, t('api.error.permissionDenied'));
    let message = t('api.error.general');
    try {
      const result = await res.json();
      message += ` : ${result.message ?? result.cause}`;
    } catch (e) { }
    throw new HttpClientError(res.status, message)
  };
  const data = await res.json();
  return data
}