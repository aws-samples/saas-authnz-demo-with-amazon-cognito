// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { fetchAPI } from './fetcher';

export interface ProviderDetails {
  MetadataURL?: string
  MetadataFile?: string
  oidc_issuer?: string
  client_id?: string
  client_secret?: string
  attributes_request_method?: string
  authorize_scopes?: string
}

export interface RegisterIdpMappingParams {
  providerType: 'SAML' | 'OIDC'
  providerDetails: ProviderDetails
  emailMappingAttribute: string
}

export interface UpdateIdpMappingParams {
  providerDetails: ProviderDetails
  emailMappingAttribute: string
}

export interface IdpMapping {
  tenantId: string
  providerType: 'SAML' | 'OIDC'
  providerDetails: ProviderDetails
  emailMappingAttribute: string
}

export async function getIdpMapping(token: string): Promise<IdpMapping> {
  return await fetchAPI("GET", "/api/idp-mapping", undefined, token) as IdpMapping;
}

export async function registerIdpMapping(params: RegisterIdpMappingParams, token: string): Promise<IdpMapping> {
  return await fetchAPI("POST", "/api/idp-mapping", params, token) as IdpMapping;
}

export async function updateIdpMapping(params: UpdateIdpMappingParams, token: string): Promise<IdpMapping> {
  return await fetchAPI("PUT", "/api/idp-mapping", params, token) as IdpMapping;
}

export async function deregisterIdpMapping(token: string): Promise<void> {
  await fetchAPI("DELETE", "/api/idp-mapping", undefined, token) as IdpMapping;
}