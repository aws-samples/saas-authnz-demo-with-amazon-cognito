// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthServiceProvider } from './service/AuthService';
import RequireAuth from './component/RequireAuth';
import Profile from './page/Profile';
import Tenant from './page/Tenant';
import TenantIdp from './page/TenantIdp';
import SelectTenant from './page/SelectTenant';
import Login from './page/Login';
import Logout from './component/Logout';
import '@aws-amplify/ui-react/styles.css';
import AccessDenied from './page/AccessDenied';

function App() {
  return (
    <div className="App">
      <AuthServiceProvider>
        <BrowserRouter>
          <Routes>
            <Route path={`/`} element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path={`/tenant`} element={<RequireAuth><Tenant /></RequireAuth>} />
            <Route path={`/idp-mapping`} element={<RequireAuth><TenantIdp /></RequireAuth>} />
            <Route path={`/login`} element={<SelectTenant />} />
            <Route path={`/login/:tenantId`} element={<Login />} />
            <Route path={`/logout`} element={<RequireAuth><Logout /></RequireAuth>} />
            <Route path={`/access-denied`} element={<RequireAuth><AccessDenied /></RequireAuth>} />
          </Routes>
        </BrowserRouter>
      </AuthServiceProvider>
    </div>
  );
}

export default App;
