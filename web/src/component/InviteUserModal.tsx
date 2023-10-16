// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState } from 'react';
import { 
  Box, Button, SpaceBetween, Modal, FormField, Input, Select, Flashbar, FlashbarProps
} from '@cloudscape-design/components';
import { useTranslation, Trans } from 'react-i18next';
import { UserProfile, inviteTenantUser, InviteTenantUserParams } from '../api/TenantUserService';
import { useAuthService } from '../service/AuthService';
import { HttpClientError } from '../api/fetcher';

export function InviteUserModal({ visible, onDismiss, onSubmit }: { 
  visible: boolean, 
  onDismiss: () => void, 
  onSubmit: (user: UserProfile) => void 
}) {
  const { identity } = useAuthService();
  const initialParams = {
    displayName: "",
    email: "",
    role: "member",
  } as InviteTenantUserParams;
  const [params, setParams] = useState<InviteTenantUserParams>(initialParams);
  const [messages, setMessages] = useState<FlashbarProps.MessageDefinition[]>([]);
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      closeAriaLabel={t('common.modal.cancel')}
      header={t('user-manager.menu.inviteUser')}
      footer={(
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              <Trans
                i18nKey="common.modal.cancel"
              />
            </Button>
            <Button variant="primary" onClick={async () => {
              try {
                const result = await inviteTenantUser(params, identity?.idToken ?? "");
                onSubmit(result);
                setParams(initialParams);
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
                i18nKey="user-manager.modal.submitInviteUser"
              />
            </Button>
          </SpaceBetween>
        </Box>
      )}
    >
      <Flashbar items={messages}/>
      <FormField label={t('common.profile-model.email')}>
        <Input value={params.email}
          onChange={(event: any) => setParams({
            ...params,
            email: event.detail.value
          })}/>
      </FormField>
      <FormField label={t('common.profile-model.displayName')}>
        <Input value={params.displayName ?? params.email}
          onChange={(event: any) => setParams({
            ...params,
            displayName: event.detail.value
          })}/>
      </FormField>
      <FormField label={t('common.profile-model.role')}>
        <Select 
          selectedOption={{ label: params.role, value: params.role }}
          options={[
            { label: "admin", value: "admin" },
            { label: "member", value: "member" },
          ]}
          onChange={(event: any) => setParams({
            ...params,
            role: event.detail.selectedOption.value
          })}/>
      </FormField>
    </Modal>
  )
}