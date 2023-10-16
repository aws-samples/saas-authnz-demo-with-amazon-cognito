// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { fetchAPI } from './fetcher';

export interface AuthConfig {
  tenantId: string,
  userpool: {
    region: string,
    userPoolId: string,
    userPoolWebClientId: string,
    oauth: {
      domain: string,
      scope: string[],
      responseType: string,
      redirectSignIn: string,
      redirectSignOut: string,
    }
  },
  flags: {
    federationEnabled: boolean,
  }
}

export async function getAuthConfig(tenantId: string, controller?: AbortController | undefined): Promise<AuthConfig> {
  const data = await fetchAPI("GET", `/api/authconfig/${tenantId}`, undefined, undefined, controller);
  const userpoolSetting = Object.assign({}, data.userpool);
  userpoolSetting.oauth = Object.assign({}, userpoolSetting.oauth, {
    redirectSignIn: `${window.location.origin}/login/${tenantId}`,
    redirectSignOut: `${window.location.origin}/logout`,
  });
  return { ...data, userpool: userpoolSetting };
}