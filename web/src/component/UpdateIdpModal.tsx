// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState } from 'react';
import { 
  SpaceBetween, Box, Input, Button, Modal, FormField, Flashbar, FlashbarProps
} from '@cloudscape-design/components';
import { IdpMapping, updateIdpMapping, RegisterIdpMappingParams } from '../api/IdpMappingService'
import { useTranslation, Trans } from 'react-i18next';
import { useAuthService } from '../service/AuthService';
import { HttpClientError } from '../api/fetcher';
import { SAMLProviderDetailsForm } from '../component/SAMLProviderDetailsForm';
import { OIDCProviderDetailsForm } from '../component/OIDCProviderDetaisForm';

export function UpdateIdpModal({ currentValue, visible, onDismiss, onSubmit }: { 
  currentValue: IdpMapping,
  visible: boolean,
  onDismiss: () => void,
  onSubmit: (idpMapping: IdpMapping) => void
}) {
  const { identity } = useAuthService();
  const [params, setParams] = useState<RegisterIdpMappingParams>(currentValue);
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
                const result = await updateIdpMapping(params as RegisterIdpMappingParams, identity?.idToken ?? "");
                onSubmit(result);
                onDismiss();
              } catch(e) {
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
                i18nKey="tenant-idp-page.modal.submitUpdateIdp"
              />
            </Button>
          </SpaceBetween>
        </Box>
      }
      header={t('tenant-idp-page.menu.updateIdp')}
    >
      <Flashbar items={messages}/>
      <div>
        <Box variant="awsui-key-label">
        <Trans
          i18nKey="tenant-idp-page.modal.submitUpdateIdp"
        />
        </Box>
        <Box variant="p">{params.providerType}</Box>
      </div>
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