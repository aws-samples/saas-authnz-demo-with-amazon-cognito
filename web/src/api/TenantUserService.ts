// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { fetchAPI } from "./fetcher"

export interface UserProfile {
  tenantId: string,
  userId: string,
  displayName: string,
  email: string,
  role: string,
  type: string,
}

export interface InviteTenantUserParams {
  displayName: string
  email: string
  role: 'admin' | 'member'
}

export interface GetTenantUserParams {
  userId: string
}

export interface UpdateTenantUserProfileParams {
  userId: string
  displayName: string
}

export interface UpdateTenantUserRoleParams {
  userId: string
  role: 'admin' | 'member'
}

export interface DeleteTenantUserParams {
  userId: string
}

export async function inviteTenantUser(params: InviteTenantUserParams, token: string): Promise<UserProfile> {
  return await fetchAPI("POST", "/api/user", params, token) as UserProfile;
}

export async function getTenantUsers(token: string): Promise<UserProfile[]> {
  return await fetchAPI("GET", "/api/user", undefined, token) as UserProfile[];
}

export async function getTenantUser(params: GetTenantUserParams, token: string): Promise<UserProfile> {
  return await fetchAPI("GET", `/api/user/${params.userId}`, undefined, token) as UserProfile;
}

export async function updateTenantUserProfile(params: UpdateTenantUserProfileParams, token: string): Promise<UserProfile> {
  return await fetchAPI("PUT", `/api/user/${params.userId}/profile`, params, token) as UserProfile;
}

export async function updateTenantUserRole(params: UpdateTenantUserRoleParams, token: string): Promise<UserProfile> {
  return await fetchAPI("PUT", `/api/user/${params.userId}/role`, params, token) as UserProfile;
}

export async function deleteTenantUser(params: DeleteTenantUserParams, token: string): Promise<void> {
  await fetchAPI("DELETE", `/api/user/${params.userId}`, undefined, token);
}