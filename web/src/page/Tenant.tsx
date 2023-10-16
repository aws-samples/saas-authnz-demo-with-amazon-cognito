// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, ColumnLayout, SpaceBetween, Box, Button, Header, Link
} from '@cloudscape-design/components';
import { useTranslation, Trans } from 'react-i18next';
import AuthLayout from '../layout/AuthLayout';
import UserManager from '../component/UserManager';
import { useAuthService } from '../service/AuthService';
import { AuthConfig, getAuthConfig } from '../api/AuthConfigService';
import { UpdateTenantModal } from '../component/UpdateTenantModal';

const MODAL_OPTIONS = {
  UPDATE_TENANT: 'UPDATE_TENANT',
  NONE: 'NONE'
} as const
type ModalOption = typeof MODAL_OPTIONS[keyof typeof MODAL_OPTIONS]

export default function Tenant() {
  const { identity } = useAuthService();
  const [activeModal, setActiveModal] = useState<ModalOption>(MODAL_OPTIONS.NONE);
  const [authConfig, setAuthConfig] = useState<AuthConfig|undefined>(undefined);
  useEffect(() => {
    if(!identity || !identity.tenantInfo) return
    getAuthConfig(identity.tenantInfo.tenantId).then((authConfig) => {
      setAuthConfig(authConfig);
    })
  }, [identity])
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <AuthLayout header={
      <Header variant="h1"
        actions={
          <Button onClick={() => { setActiveModal(MODAL_OPTIONS.UPDATE_TENANT); }}>
            <Trans
              i18nKey="tenant-page.menu.updateTenant"
            />
          </Button>
        }
      >
        <Trans
          i18nKey="tenant-page.header.text"
        />
      </Header>
  }>
      <SpaceBetween size="xs">
        <Container>
          <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween size="xs">
              <div>
                <Box variant="awsui-key-label">
                  <Trans
                    i18nKey="common.tenant-model.tenantName"
                  />
                </Box>
                <Box variant="p">{identity?.tenantInfo?.tenantName}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">
                  <Trans
                    i18nKey="common.tenant-model.tenantId"
                  />
                </Box>
                <Box variant="p">{identity?.tenantInfo?.tenantId}</Box>
              </div>
            </SpaceBetween>
            <SpaceBetween size="xs">
              <div>
                <Box variant="awsui-key-label">
                  <Trans
                    i18nKey="common.tenant-model.tier"
                  />
                </Box>
                <Box variant="p">{identity?.tenantInfo?.tier}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">
                  <Trans
                    i18nKey="common.tenant-idp-model.setting"
                  />
                </Box>
                <Box variant="p">
                  <Link onFollow={() => {navigate("/idp-mapping")}}>
                    {
                      authConfig ?
                        authConfig.flags.federationEnabled ?
                          t('common.tenant-idp-model.enabled')
                        :
                          t('common.tenant-idp-model.disabled')
                      :
                        t('common.loading.text')
                    }
                  </Link>
                </Box>
              </div>
            </SpaceBetween>
          </ColumnLayout>
          
        </Container>
        <UserManager />
      </SpaceBetween>
      <UpdateTenantModal
        visible={activeModal === MODAL_OPTIONS.UPDATE_TENANT}
        onDismiss={() => {setActiveModal(MODAL_OPTIONS.NONE)}}
      />
    </AuthLayout>
  )
}