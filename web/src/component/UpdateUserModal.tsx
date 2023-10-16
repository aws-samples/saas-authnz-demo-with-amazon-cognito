// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect } from 'react';
import { 
  Box, Button, SpaceBetween, Modal, FormField, Select, TextContent, Flashbar, FlashbarProps
} from '@cloudscape-design/components';
import { useTranslation, Trans } from 'react-i18next';
import { UserProfile, updateTenantUserRole, UpdateTenantUserRoleParams } from '../api/TenantUserService';
import { useAuthService } from '../service/AuthService';
import { HttpClientError } from '../api/fetcher';

export function UpdateUserRoleModal({ visible, target, onDismiss, onSubmit }: { 
  visible: boolean, 
  target: UserProfile, 
  onDismiss: () => void, 
  onSubmit: (users: UserProfile) => void 
}) {
  const { identity } = useAuthService();
  const [params, setParams] = useState<UpdateTenantUserRoleParams>({
    userId: "",
    role: "member"
  });
  const [messages, setMessages] = useState<FlashbarProps.MessageDefinition[]>([])
  const { t } = useTranslation();
  useEffect(() => {
    setParams({
      userId: target.userId,
      role: target.role as UpdateTenantUserRoleParams["role"]
    });
  }, [target.userId, target.role])
  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      closeAriaLabel={t('common.modal.close')}
      header={t('user-manager.menu.changeRole')}
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
                const results = await updateTenantUserRole(params, identity?.idToken ?? "");
                onSubmit(results);
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
                i18nKey="user-manager.modal.submitChangeRole"
              />
            </Button>
          </SpaceBetween>
        </Box>
      )}
    >
      <Flashbar items={messages}/>
      <TextContent>
        <Trans
          i18nKey="user-manager.modal.confirmChangeRole"
          values={{
            displayName: target.displayName,
            email: target.email
          }}
        />
      </TextContent>
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