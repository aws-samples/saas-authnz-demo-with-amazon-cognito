// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect } from 'react';
import { 
  Container, ColumnLayout, SpaceBetween, Box, Textarea, Spinner,
  Input, Button, Header, FormField, TextContent, ButtonDropdown
} from '@cloudscape-design/components';
import { useTranslation, Trans } from 'react-i18next';
import AuthLayout from '../layout/AuthLayout';
import { IdpMapping, getIdpMapping} from '../api/IdpMappingService'
import { useAuthService } from '../service/AuthService';
import { getAuthConfig, AuthConfig } from '../api/AuthConfigService';
import { PermissionError } from '../api/fetcher';
import { RegisterIdpModal } from '../component/RegisterIdpModal';
import { UpdateIdpModal } from '../component/UpdateIdpModal';
import { DeregisterIdpModal } from '../component/DeregisterIdpModal';

const MODAL_OPTIONS = {
  REGISTER_IDP: 'REGISTER_IDP',
  UPDATE_IDP: 'UPDATE_IDP',
  DEREGISTER_IDP: 'DEREGISTER_IDP',
  NONE: 'NONE'
}
type ModalOption = typeof MODAL_OPTIONS[keyof typeof MODAL_OPTIONS]

export default function TenantIdp() {
  const { identity } = useAuthService();
  const [activeModal, setActiveModal] = useState<ModalOption>(MODAL_OPTIONS.NONE);
  const [authConfig, setAuthConfig] = useState<AuthConfig|undefined>(undefined);
  const [idpMapping, setIdpMapping] = useState<IdpMapping|undefined>(undefined);
  const [permissionError, setPermissionError] = useState<PermissionError|undefined>(undefined);
  const { t } = useTranslation();

  useEffect(() => {
    Promise.allSettled([
      getAuthConfig(identity?.tenantInfo?.tenantId ?? ""),
      getIdpMapping(identity?.idToken ?? "")
    ]).then(([authConfigResult, idpMappingResult]) => {
      if(authConfigResult.status === 'fulfilled') {
        setAuthConfig(authConfigResult.value);
      }
      if(idpMappingResult.status === 'fulfilled') {
        setIdpMapping(idpMappingResult.value);
      } else {
        const error = idpMappingResult.reason as Error;
        if (error instanceof PermissionError) {
          setPermissionError(error);
        }
      }
    })
  }, [identity])

  return (
    <AuthLayout header={
      <Header variant="h1"
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <ButtonDropdown
              disabled={!authConfig || !idpMapping}
              items={[
                {
                  text: t('tenant-idp-page.menu.updateIdp'),
                  id: "UPDATE_IDP",
                },
                {
                  text: t('tenant-idp-page.menu.deregisterIdp'),
                  id: "DEREGISTER_IDP",
                }
              ]}
              onItemClick={(event) => { 
                switch(event.detail.id) {
                  case 'UPDATE_IDP':
                    setActiveModal(MODAL_OPTIONS.UPDATE_IDP);
                    break
                  case 'DEREGISTER_IDP':
                    setActiveModal(MODAL_OPTIONS.DEREGISTER_IDP);
                    break
                }
              }}
            >
              <Trans
                i18nKey="tenant-idp-page.menu.manageIdp"
              />
            </ButtonDropdown>
            <Button
              onClick={() => { setActiveModal(MODAL_OPTIONS.REGISTER_IDP); }}
              disabled={!authConfig || !!idpMapping || !!permissionError}
            >
              <Trans
                i18nKey="tenant-idp-page.menu.registerIdp"
              />
            </Button>
          </SpaceBetween>
        }
      >
        <Trans
          i18nKey="tenant-idp-page.header.text"
        />
      </Header>
    }>
      {authConfig ? 
        (authConfig.flags.federationEnabled && idpMapping) ?
          <Container>
            <ColumnLayout columns={2} variant="text-grid">
              <SpaceBetween size="xs">
                <div>
                  <Box variant="awsui-key-label">
                    <Trans
                      i18nKey="common.tenant-idp-model.type"
                    />
                  </Box>
                  <Box variant="p">{idpMapping.providerType}</Box>
                </div>
                {idpMapping.providerType === "SAML" ? 
                  <>
                    <FormField label={t('common.tenant-idp-model.SAML-ACSURL')}>
                      <Input
                        value={`https://${identity?.authConfig?.userpool.oauth.domain}/saml2/idpresponse`}
                        readOnly/>
                    </FormField>
                    <FormField label={t('common.tenant-idp-model.SAML-applicationURN')}>
                      <Input
                        value={`urn:amazon:cognito:sp:${identity?.authConfig?.userpool.userPoolId}`}
                        readOnly/>
                    </FormField>
                    <div>
                      <Box variant="awsui-key-label">
                        <Trans
                          i18nKey="common.tenant-idp-model.SAML-metadata"
                        />
                      </Box>
                      {idpMapping.providerDetails.MetadataURL &&
                        <Input
                          value={idpMapping.providerDetails.MetadataURL}
                          readOnly
                        />}
                      {idpMapping.providerDetails.MetadataFile &&
                        <Textarea
                          value={idpMapping.providerDetails.MetadataFile ?? ""}
                          rows={8}
                          readOnly
                        />
                      }
                    </div>
                  </>
                  :
                  <>
                    <FormField label={t('common.tenant-idp-model.OIDC-callback')}>
                      <Input
                        value={`https://${identity?.authConfig?.userpool.oauth.domain}/oauth2/idpresponse`}
                        readOnly/>
                    </FormField>
                    <div>
                      <Box variant="awsui-key-label">
                        <Trans
                          i18nKey="common.tenant-idp-model.OIDC-issuer"
                        />
                      </Box>
                      <Input
                          value={idpMapping.providerDetails.oidc_issuer ?? ""}
                          readOnly
                        />
                    </div>
                    <div>
                      <Box variant="awsui-key-label">
                        <Trans
                          i18nKey="common.tenant-idp-model.OIDC-clientId"
                        />
                      </Box>
                      <Input
                          value={idpMapping.providerDetails.client_id ?? ""}
                          readOnly
                        />
                    </div>
                    <div>
                      <Box variant="awsui-key-label">
                        <Trans
                          i18nKey="common.tenant-idp-model.OIDC-clientSecret"
                        />
                      </Box>
                      <Input
                          value={idpMapping.providerDetails.client_secret ?? ""}
                          readOnly
                        />
                    </div>
                    <div>
                      <Box variant="awsui-key-label">
                        <Trans
                          i18nKey="common.tenant-idp-model.OIDC-scope"
                        />
                      </Box>
                      <Box variant="p">{idpMapping.providerDetails.authorize_scopes}</Box>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">
                        <Trans
                          i18nKey="common.tenant-idp-model.OIDC-attributesRequestMethod"
                        />
                      </Box>
                      <Box variant="p">{idpMapping.providerDetails.attributes_request_method}</Box>
                    </div>
                  </>
                }
              </SpaceBetween>
              <SpaceBetween size="xs">
                <div>
                  <Box variant="awsui-key-label">
                    <Trans
                      i18nKey="common.tenant-idp-model.emailAttributeMapping"
                    />
                  </Box>
                  <Box variant="p">{idpMapping.emailMappingAttribute}</Box>
                </div>
              </SpaceBetween>
            </ColumnLayout>
          </Container>
        :
          <Container>
            {!permissionError ?
              <TextContent>
                <Trans
                  i18nKey="tenant-idp-page.general.notFound"
                />
              </TextContent>
            :
              <TextContent>{permissionError.message}</TextContent>
            }
          </Container>
      :
        <Spinner/>

      }
      <RegisterIdpModal
        visible={activeModal === MODAL_OPTIONS.REGISTER_IDP}
        onDismiss={() => {setActiveModal(MODAL_OPTIONS.NONE)}}
        onSubmit={(value) => {
          setIdpMapping(value);
          setAuthConfig({...authConfig!, flags: {
            federationEnabled: true,
          }});
        }}
      />
      {idpMapping && <UpdateIdpModal
        currentValue={idpMapping}
        visible={activeModal === MODAL_OPTIONS.UPDATE_IDP}
        onDismiss={() => {setActiveModal(MODAL_OPTIONS.NONE)}}
        onSubmit={(value) => {
          setIdpMapping(value);
          setAuthConfig({...authConfig!, flags: {
            federationEnabled: true
          }});
        }}
      />}
      <DeregisterIdpModal
        visible={activeModal === MODAL_OPTIONS.DEREGISTER_IDP}
        onDismiss={() => {setActiveModal(MODAL_OPTIONS.NONE)}}
        onSubmit={() => {
          setIdpMapping(undefined);
          setAuthConfig({...authConfig!, flags: {
            federationEnabled: false
          }});
        }}
      />
    </AuthLayout>
  )
}