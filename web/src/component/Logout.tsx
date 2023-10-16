// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Loader } from '@aws-amplify/ui-react';
import { useAuthService } from '../service/AuthService';

export default function Logout() {
  const { signOut } = useAuthService();
  signOut();
  return <Loader/>
};
