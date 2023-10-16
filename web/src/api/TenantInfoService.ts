// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { fetchAPI } from "./fetcher";

export interface TenantInfo {
  tenantId: string,
  tenantName: string,
  tier: string,
}

export interface UpdateTenantInfoParams {
  tenantName: string,
  tier: string,
}

export async function getTenantInfo(token: string): Promise<TenantInfo> {
  return await fetchAPI("GET", "/api/tenantinfo", undefined, token) as TenantInfo;
}

export async function updateTenantInfo(params: UpdateTenantInfoParams, token: string): Promise<TenantInfo> {
  return await fetchAPI("PUT", "/api/tenantinfo", params, token) as TenantInfo;
}