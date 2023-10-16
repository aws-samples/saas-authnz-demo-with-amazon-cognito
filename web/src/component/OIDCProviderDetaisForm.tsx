// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { 
  Input, FormField, RadioGroup
} from '@cloudscape-design/components';
import { useTranslation } from 'react-i18next';
import { useAuthService } from '../service/AuthService';


interface OIDCProviderDetailsParams {
  oidc_issuer?: string,
  client_id?: string,
  client_secret?: string,
  authorize_scopes?: string,
  attributes_request_method?: string
}

export function OIDCProviderDetailsForm({providerDetails, onChange}: {
  providerDetails: OIDCProviderDetailsParams,
  onChange: (providerDetails: OIDCProviderDetailsParams) => void
}) {
  const { identity } = useAuthService();
  const { t } = useTranslation();
  return (
    <>
      <FormField label="Callback URL">
        <Input
          value={`https://${identity?.authConfig?.userpool.oauth.domain}/oauth2/idpresponse`}
          readOnly/>
      </FormField>
      <FormField label={t('common.tenant-idp-model.OIDC-issuer')}>
        <Input value={providerDetails.oidc_issuer ?? ""}
          onChange={(event: any) => onChange({
            ...providerDetails,
            oidc_issuer: event.detail.value
          })}/>
      </FormField>
      <FormField label={t('common.tenant-idp-model.OIDC-clientId')}>
        <Input value={providerDetails.client_id ?? ""}
          onChange={(event: any) => onChange({
            ...providerDetails,
            client_id: event.detail.value
          })}/>
      </FormField>
      <FormField label={t('common.tenant-idp-model.OIDC-clientSecret')}>
        <Input value={providerDetails.client_secret ?? ""}
          onChange={(event: any) => onChange({
            ...providerDetails,
            client_secret: event.detail.value
          })}/>
      </FormField>
      <FormField label={t('common.tenant-idp-model.OIDC-scope')}>
        <Input value={providerDetails.authorize_scopes ?? ""}
          onChange={(event: any) => onChange({
            ...providerDetails,
            authorize_scopes: event.detail.value
          })}/>
      </FormField>
      <FormField label={t('common.tenant-idp-model.OIDC-attributesRequestMethod')}>
        <RadioGroup
          onChange={({ detail }) => onChange({
            ...providerDetails,
            attributes_request_method: detail.value
          })}
          value={providerDetails.attributes_request_method ?? ""}
          items={[
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" }
          ]}
        />
      </FormField>
    </>
  )
}