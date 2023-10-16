// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthService } from '../service/AuthService';

// see : https://ui.docs.amplify.aws/react/guides/auth-protected
export default function RequireAuth({
  children
}: { children?: ReactNode }) {
  const location = useLocation();
  const { authenticated, identity } = useAuthService();
  const accessDenied = !identity?.myProfile;
  const prevTenant = localStorage.getItem("prev-tenant");
  if (!authenticated) {
    return <Navigate
      to={prevTenant ? `/login/${prevTenant}` : "/login"}
      state={{ from: location }}
      replace
    />
  }
  if (accessDenied && location.pathname !== "/access-denied") {
    return <Navigate to={"/access-denied"} replace />
  }
  if (!accessDenied && location.pathname === "/access-denied") {
    return <Navigate to={"/"} replace />
  }
  return <>{children}</>
};