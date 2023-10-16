// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthService } from '../service/AuthService';

// see : https://ui.docs.amplify.aws/react/guides/auth-protected
export default function RequireUnauth({
  children
}: { children?: ReactNode }) {
  const location = useLocation();
  const { authenticated } = useAuthService();
  return (
    <>
      {!!authenticated ?
        <Navigate to={location.state?.from?.pathname || '/'} state={{ from: location }} replace />
        : 
        children
      }
    </>
  )
};