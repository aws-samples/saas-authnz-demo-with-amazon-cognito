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

interface CognitoConfig {
  Cognito: {
    userPoolId: string,
    userPoolClientId: string,
    loginWith: {
      oauth: {
        domain: string,
        scopes: string[],
        redirectSignIn: string[],
        redirectSignOut: string[],
        responseType: 'code' | 'token',
      }
    }
  }
}

export function toCognitoConfig(config: AuthConfig): CognitoConfig {
  return {
    Cognito: {
      userPoolId: config.userpool.userPoolId,
      userPoolClientId: config.userpool.userPoolWebClientId,
      loginWith: {
        oauth: {
          domain: config.userpool.oauth.domain,
          scopes: config.userpool.oauth.scope,
          redirectSignIn: [config.userpool.oauth.redirectSignIn],
          redirectSignOut: [config.userpool.oauth.redirectSignOut],
          responseType: config.userpool.oauth.responseType as 'code' | 'token',
        }
      }
    }
  };
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