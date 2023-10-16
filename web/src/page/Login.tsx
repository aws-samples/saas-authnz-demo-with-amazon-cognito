// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { Auth, I18n } from 'aws-amplify';
import { Button, Flex, Loader, Text, Divider } from '@aws-amplify/ui-react';
import { useTranslation, Trans } from 'react-i18next';
import { getAuthConfig, AuthConfig } from '../api/AuthConfigService';
import UnauthLayout from '../layout/UnauthLayout';
import { useAuthService } from '../service/AuthService';
import { AmplifyUser } from '@aws-amplify/ui';

export default function Login() {
  const params = useParams();
  const tenantId = params.tenantId ?? "";
  const [isReady, setIsReady] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig|undefined>(undefined)
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    I18n.setLanguage(i18n.language)
    I18n.putVocabulariesForLanguage(i18n.language, {
      // signIn
      Username: t('sign-in-page.sign-in.emailLabel'),
      Password: t('sign-in-page.sign-in.passwordLabel'),
      'Enter your Username': t('sign-in-page.sign-in.emailPlaceholder'),
      'Enter your Password': t('sign-in-page.sign-in.passwordPlaceholder'),
      'Sign in': t('sign-in-page.sign-in.buttonLabel'),
      'Signing in': t('sign-in-page.sign-in.inProgress'),
      'Forgot your password?': t('sign-in-page.sign-in.forgotPassword'),
      // change password
      'Change Password': t('sign-in-page.change-password.changePassword'),
      'New Password': t('sign-in-page.change-password.newPassword'),
      'Confirm Password': t('sign-in-page.change-password.confirmPassword'),
      'Please confirm your Password': t('sign-in-page.sign-in.passwordPlaceholder'),
      // reset password
      'Reset Password': t('sign-in-page.reset-password.header'),
      'Enter your username': t('sign-in-page.reset-password.email'),
      'Send code': t('sign-in-page.reset-password.sendCode'),
      'Resend Code': t('sign-in-page.reset-password.resendCode'),
      'Back to Sign In': t('sign-in-page.reset-password.backToSignIn'),
      'Code': t('sign-in-page.reset-password.code'),
      'Submit': t('sign-in-page.reset-password.submit'),
      'Sending': t('sign-in-page.reset-password.sending'),
      'Changing': t('sign-in-page.reset-password.changing'),
      // errors
      'Your passwords must match': t('sign-in-page.error.passwordMismatch'),
      'Incorrect username or password.': t('sign-in-page.error.incorrectUsernameOrPassword')
    });
  }, [i18n.language])

  useEffect(() => {
    const cache = localStorage.getItem(`authConfig-cache.${tenantId}`);
    if(cache) {
      Auth.configure(JSON.parse(cache).userpool)
    }
    getAuthConfig(tenantId).then((authConfig)=> {
      Auth.configure(authConfig.userpool);
      localStorage.setItem(`authConfig-cache.${tenantId}`, JSON.stringify(authConfig));
      setAuthConfig(authConfig);
      setIsReady(true);
    })
    .catch((error) => {
      console.error(error);
    })
  }, [tenantId])

  const services = {
    async handleSignIn({username, password}: {username: string, password: string}) {
      return await Auth.signIn(`${tenantId}#${username}`, password);
    },
    async handleForgotPassword(username: string) {
      return await Auth.forgotPassword(`${tenantId}#${username}`);
    },
    async handleForgotPasswordSubmit({username, code, password}: {username: string, code: string, password: string}) {
      return await Auth.forgotPasswordSubmit(`${tenantId}#${username}`, code, password);
    }
  };
  const components = {
    Footer() {
      return authConfig?.flags.federationEnabled ?
        <Flex direction='column'>
          <Divider/>
          <Button variation="primary" onClick={() => Auth.federatedSignIn({customProvider: `external-idp-${tenantId}`})}>
            <Trans
              i18nKey="sign-in-page.general.federatedSignIn"
            />
          </Button>
        </Flex>
          :
        <></>
    }
  }
  return (
    <UnauthLayout>
      <Text>
        <Trans
          i18nKey="sign-in-page.general.signInTo"
        /> : {tenantId}
      </Text>
      {isReady ? 
        <Flex direction='column'>
          <Authenticator hideSignUp={true} components={components} services={services}>
            {({ user }) => <AuthHandler user={user}/>}
          </Authenticator>
          <Button onClick={() => navigate("/login")}>
            <Trans
              i18nKey="sign-in-page.general.switchTenant"
            />
          </Button>
        </Flex> : <Loader/>
      }
    </UnauthLayout>
  )
}

function AuthHandler({ user }: {
  user: AmplifyUser|undefined
}) {
  const { signIn } = useAuthService();
  useEffect(() => {
    if(user) signIn(user);
  }, [user, signIn]);
  return <></>
}