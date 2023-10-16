// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, ColumnLayout, SpaceBetween, Box, Textarea, Link,
  Input, Button, Header, Modal, FormField, Popover, StatusIndicator, Flashbar, FlashbarProps
} from '@cloudscape-design/components';
import { useTranslation, Trans } from 'react-i18next';
import AuthLayout from '../layout/AuthLayout';
import { useAuthService, UpdateMyProfileParams } from '../service/AuthService';
import { HttpClientError } from '../api/fetcher';

export default function Profile() {
  const { identity, updateMyProfile, signOut } = useAuthService();
  const [modalOpened, setModalOpened] = useState<boolean>(false);
  const [params, setParams] = useState<UpdateMyProfileParams>({ displayName: "" });
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    setParams({displayName: identity?.myProfile?.displayName ?? ""})
  }, [identity])

  const copyTextToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  }
  const [messages, setMessages] = useState<FlashbarProps.MessageDefinition[]>([])

  return (
    <AuthLayout header={
      <Header variant="h1"
        actions={
          <Button onClick={() => { setModalOpened(true); }}>
            <Trans
              i18nKey="profile-page.action.changeProfile"
            />
          </Button>
      }>
        <Trans
          i18nKey="profile-page.header.text"
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
                    i18nKey="common.profile-model.displayName"
                  />
                </Box>
                <Box variant="p">{identity?.myProfile?.displayName}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">
                  <Trans
                    i18nKey="common.profile-model.email"
                  />
                </Box>
                <Box variant="p">{identity?.myProfile?.email}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">
                  <Trans
                    i18nKey="common.profile-model.role"
                  />
                </Box>
                <Box variant="p">{identity?.myProfile?.role}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">
                  <Trans
                    i18nKey="common.profile-model.tenant"
                  />
                </Box>
                <Box variant="p">
                  <Link onFollow={() => {navigate("/tenant")}}>
                    {identity?.tenantInfo?.tenantName}
                  </Link>
                </Box>
              </div>
              <div>
                <Box variant="awsui-key-label">
                  <Trans
                    i18nKey="common.profile-model.userId"
                  />
                </Box>
                <Box variant="p">{identity?.myProfile?.userId}</Box>
              </div>
            </SpaceBetween>
            <SpaceBetween size="xs">
              <div>
                <Box variant="awsui-key-label">
                  <Trans
                    i18nKey="common.profile-model.idToken"
                  />
                  <Popover
                    dismissButton={false} position="top" size="medium" triggerType="custom"
                    content={
                      <StatusIndicator type="success">
                        <Trans
                          i18nKey="component.general.copy.complete"
                        />
                      </StatusIndicator>
                    }
                  >
                    <Button iconName="copy" variant="inline-icon" 
                      onClick={() => {copyTextToClipboard(identity?.idToken ?? "")}}
                    />
                  </Popover>
                </Box>
                <Input value={identity?.idToken ?? ""} readOnly/>
              </div>
              <div>
                <Box variant="awsui-key-label">
                  <Trans
                    i18nKey="common.profile-model.claims"
                  />
                </Box>
                <Textarea value={JSON.stringify(identity?.idTokenPayload, undefined, 2)} rows={10} readOnly/>
              </div>
            </SpaceBetween>
          </ColumnLayout>
          <Modal
            onDismiss={() => setModalOpened(false)}
            visible={modalOpened}
            closeAriaLabel={t('common.modal.close')}
            footer={
              <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="link" onClick={() => setModalOpened(false)}>
                    <Trans
                      i18nKey="common.modal.cancel"
                    />
                  </Button>
                  <Button variant="primary" onClick={async () => {
                    try {
                      await updateMyProfile(params);
                      setModalOpened(false);
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
                      i18nKey="profile-page.modal.submitChangeProfile"
                    />
                  </Button>
                </SpaceBetween>
              </Box>
            }
            header={t('profile-page.action.changeProfile')}>
            <Flashbar items={messages}/>
            <FormField label={t('common.profile-model.displayName')}>
              <Input value={params.displayName}
                onChange={(event: any) => setParams({displayName: event.detail.value})}/>
            </FormField>
          </Modal>
        </Container>
        <Button onClick={() => {signOut()}}>
          <Trans
            i18nKey="common.action.signOut"
          />
        </Button>
      </SpaceBetween>
    </AuthLayout>
  )
}