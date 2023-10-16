// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState } from 'react';
import { 
  SpaceBetween, Box, Select, Input, Button, Modal, FormField, Flashbar, FlashbarProps
} from '@cloudscape-design/components';
import { useTranslation, Trans } from 'react-i18next';
import { useAuthService } from '../service/AuthService';
import { UpdateTenantInfoParams } from '../api/TenantInfoService'
import { HttpClientError } from '../api/fetcher';

export function UpdateTenantModal({ visible, onDismiss }: { 
  visible: boolean, 
  onDismiss: () => void, 
}) {
  const { identity, updateTenantInfo } = useAuthService();
  const [params, setParams] = useState<UpdateTenantInfoParams>({
    tenantName: identity?.tenantInfo?.tenantName ?? "",
    tier: identity?.tenantInfo?.tier ?? "",
  })
  const [messages, setMessages] = useState<FlashbarProps.MessageDefinition[]>([])
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      closeAriaLabel={t('common.modal.close')}
      header={t('tenant-page.menu.updateTenant')}
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
                await updateTenantInfo(params);
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
                i18nKey="tenant-page.modal.submitUpdateTenant"
              />
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <Flashbar items={messages}/>
      <FormField label={t('common.tenant-model.tenantName')}>
        <Input value={params.tenantName}
          onChange={(event: any) => setParams({
            ...params,
            tenantName: event.detail.value
          })}/>
      </FormField>
      <FormField label={t('common.tenant-model.tier')}>
        <Select 
          selectedOption={{ label: params.tier,value: params.tier }}
          options={[
            { label: "BASIC", value: "BASIC" },
            { label: "PREMIUM", value: "PREMIUM" },
          ]}
          onChange={(event: any) => setParams({
            ...params,
            tier: event.detail.selectedOption.value
          })}/>
      </FormField>
    </Modal>
  )
}