// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { createContext, ReactNode, useState, useContext } from "react";
import { Auth } from "aws-amplify";
import { AmplifyUser } from '@aws-amplify/ui';
import { Spinner } from "@cloudscape-design/components";
import { TenantInfo, getTenantInfo, updateTenantInfo, UpdateTenantInfoParams } from "../api/TenantInfoService";
import { UserProfile, getTenantUser, updateTenantUserProfile } from "../api/TenantUserService";
import { AuthConfig, getAuthConfig } from "../api/AuthConfigService";

interface Identity {
  myProfile?: UserProfile,
  tenantInfo?: TenantInfo,
  idToken: string,
  idTokenPayload: any,
  authConfig?: AuthConfig
}

export interface UpdateMyProfileParams {
  displayName: string
}

export interface IAuthServiceContext {
  authenticated: boolean
  identity?: Identity
  loading: boolean
  updateMyProfile: (params: UpdateMyProfileParams) => Promise<void>
  updateTenantInfo: (params: UpdateTenantInfoParams) => Promise<void>
  signIn: (user: AmplifyUser) => Promise<void>
  signOut: () => Promise<void>
}

const AuthServiceContext = createContext<IAuthServiceContext|null>(null);

export function AuthServiceProvider({
  children
}: { children?: ReactNode }) {
  const [loading, setLoading] = useState<boolean>(false);
  const [identity, setIdentity] = useState<Identity|undefined>(undefined);

  const value = {
    authenticated: identity ? true : false,
    loading,
    identity,
    updateMyProfile: async (params: UpdateMyProfileParams) => {
      if(!identity || !identity.myProfile) throw Error("unauthorized");
      const myProfile = await updateTenantUserProfile({
        ...params,
        userId: identity.myProfile.userId
      }, identity.idToken);
      setIdentity({...identity, myProfile});
    },
    updateTenantInfo: async (params: UpdateTenantInfoParams) => {
      if(!identity) throw Error("unauthorized");
      const tenantInfo = await updateTenantInfo(params, identity.idToken);
      setIdentity({...identity, tenantInfo});
    },
    signIn: async (user: AmplifyUser) => {
      setLoading(true);
      const session = user.getSignInUserSession();
      if(!session) throw Error("failed to fetch user session");
      const idTokenObj = session.getIdToken();
      const idToken = idTokenObj.getJwtToken();
      const idTokenPayload = idTokenObj.payload;
      try {
        const [myProfile, tenantInfo, authConfig] = await Promise.all([
          getTenantUser({userId: idTokenPayload.sub}, idToken),
          getTenantInfo(idToken),
          getAuthConfig(idTokenPayload.tenantId)
        ]);
        setIdentity({ myProfile, tenantInfo, idToken, idTokenPayload, authConfig })
        localStorage.setItem("prev-tenant", tenantInfo.tenantId);
      } catch(e) {
        setIdentity({ idToken, idTokenPayload });
      } finally {
        setLoading(false);
      }
    },
    signOut: async () => {
      setLoading(true);
      await Auth.signOut();
      setIdentity(undefined);
      setLoading(false);
    }
  }
  return (
    <AuthServiceContext.Provider value={value}>
      {loading ?
        <Spinner/>
      :
        children
      }
    </AuthServiceContext.Provider>
  )
}

export function useAuthService(): IAuthServiceContext {
  const context = useContext(AuthServiceContext);
  if (!context) throw Error("Uninitialized");

  return context
}
