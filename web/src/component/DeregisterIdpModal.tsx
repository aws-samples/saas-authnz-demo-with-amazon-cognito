// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState } from 'react';
import { 
  SpaceBetween, Box, Button, TextContent, Modal, Flashbar, FlashbarProps
} from '@cloudscape-design/components';
import { deregisterIdpMapping } from '../api/IdpMappingService'
import { useTranslation, Trans } from 'react-i18next';
import { useAuthService } from '../service/AuthService';
import { HttpClientError } from '../api/fetcher';

export function DeregisterIdpModal({ visible, onDismiss, onSubmit }: { 
  visible: boolean, 
  onDismiss: () => void, 
  onSubmit: () => void
}) {
  const { identity } = useAuthService();
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
                await deregisterIdpMapping(identity?.idToken ?? "");
                onSubmit();
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
                i18nKey="tenant-idp-page.modal.submitDeregisterIdp"
              />
            </Button>
          </SpaceBetween>
        </Box>
      }
      header={t('tenant-idp-page.menu.deregisterIdp')}
    >
      <Flashbar items={messages}/>
      <TextContent>
        <Trans
          i18nKey="tenant-idp-page.modal.confirmDeregisterIdp"
        />
      </TextContent>
    </Modal>
  )
}