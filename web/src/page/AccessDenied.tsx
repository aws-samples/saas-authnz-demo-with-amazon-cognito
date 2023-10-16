// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { 
  Container, SpaceBetween, Box, Textarea, Flashbar,
  Input, Button, Header, Popover, StatusIndicator
} from '@cloudscape-design/components';
import { useTranslation, Trans } from 'react-i18next';
import AuthLayout from '../layout/AuthLayout';
import { useAuthService } from '../service/AuthService';

export default function AccessDenied() {
  const { identity, signOut } = useAuthService();
  const { t } = useTranslation();
  const copyTextToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  }

  return (
    <AuthLayout header={
      <>
        <Header variant="h1">
          <Trans
            i18nKey="access-denied-page.header.text"
          />
        </Header>
        <Flashbar items={[{ type: "error", content: t('access-denied-page.general.errorMessage')}]}/>
      </>
  }>
      <SpaceBetween size="xs">
        <Container>
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
                        i18nKey="common.copy.complete"
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