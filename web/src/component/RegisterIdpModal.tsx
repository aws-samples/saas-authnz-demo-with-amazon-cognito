// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState } from 'react';
import { 
  SpaceBetween, Box, Select, Input, Button, Modal, FormField, Flashbar, FlashbarProps
} from '@cloudscape-design/components';
import { IdpMapping, registerIdpMapping, RegisterIdpMappingParams } from '../api/IdpMappingService'
import { useTranslation, Trans } from 'react-i18next';
import { useAuthService } from '../service/AuthService';
import { HttpClientError } from '../api/fetcher';
import { SAMLProviderDetailsForm } from '../component/SAMLProviderDetailsForm';
import { OIDCProviderDetailsForm } from '../component/OIDCProviderDetaisForm';

export function RegisterIdpModal({ visible, onDismiss, onSubmit }: { 
  visible: boolean, 
  onDismiss: () => void, 
  onSubmit: (idpMapping: IdpMapping) => void
}) {
  const oidcInitialProviderDetals = {
    oidc_issuer: "",
    client_id: "",
    client_secret: "",
    attributes_request_method: "",
    authorize_scopes: "openid email"
  }
  const samlInitialProviderDetails = {
    MetadataURL: ""
  }
  const { identity } = useAuthService();
  const [params, setParams] = useState<RegisterIdpMappingParams>({
    providerType: "SAML",
    providerDetails: samlInitialProviderDetails,
    emailMappingAttribute: "email"
  });
  const [messages, setMessages] = useState<FlashbarProps.MessageDefinition[]>([])
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      closeAriaLabel={t('common.modal.close')}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => onDismiss()}>
              <Trans
                i18nKey="common.modal.cancel"
              />
            </Button>
            <Button variant="primary" onClick={async () => {
              try {
                const result = await registerIdpMapping(params as RegisterIdpMappingParams, identity?.idToken ?? "");
                onSubmit(result);
                onDismiss();
              } catch (e) {
                if(e instanceof HttpClientError) {
                  setMessages([{
                    type: "error",
                    content: e.message,
                    dismissible: true,
                    onDismiss: () => {setMessages([])}
                  }])
                }
              }
            }}>
              <Trans
                i18nKey="tenant-idp-page.modal.submitRegisterIdp"
              />
            </Button>
          </SpaceBetween>
        </Box>
      }
      header={t('tenant-idp-page.menu.registerIdp')}
    >
      <Flashbar items={messages}/>
      <FormField label={t('common.tenant-idp-model.type')}>
        <Select 
          selectedOption={{ label: params.providerType ,value: params.providerType }}
          options={[
            { label: "SAML", value: "SAML" },
            { label: "OIDC", value: "OIDC" },
          ]}
          onChange={(event: any) => {
            if(event.detail.selectedOption.value === 'SAML') {
              setParams({
                ...params,
                providerType: event.detail.selectedOption.value,
                providerDetails: samlInitialProviderDetails
              });
            } else {
              setParams({
                ...params,
                providerType: event.detail.selectedOption.value,
                providerDetails: oidcInitialProviderDetals
              });
            }
          }}
        />
      </FormField>
      {params.providerType === 'SAML' ?
        <SAMLProviderDetailsForm 
          providerDetails={params.providerDetails}
          onChange={(providerDetails) => setParams({
            ...params,
            providerDetails
          })}
        />
      :
        <OIDCProviderDetailsForm 
          providerDetails={params.providerDetails}
          onChange={(providerDetails) => setParams({
            ...params,
            providerDetails
          })}
        />
      }
      <FormField label={t('common.tenant-idp-model.emailAttributeMapping')}>
        <Input value={params.emailMappingAttribute ?? ""}
          onChange={(event: any) => setParams({
            ...params,
            emailMappingAttribute: event.detail.value
          })}/>
      </FormField>
    </Modal>
  )
}