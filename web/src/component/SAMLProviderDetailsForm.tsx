// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { 
  Textarea, Input, FormField, RadioGroup
} from '@cloudscape-design/components';
import { useTranslation } from 'react-i18next';
import { useAuthService } from '../service/AuthService';

interface SAMLProviderDetailsParams {
  MetadataURL?: string,
  MetadataFile?: string,
}

export function SAMLProviderDetailsForm({providerDetails, onChange}: {
  providerDetails: SAMLProviderDetailsParams,
  onChange: (providerDetails: SAMLProviderDetailsParams) => void
}) {
  const { identity } = useAuthService();
  const { t } = useTranslation();
  return (
    <>
      <FormField label={t('common.tenant-idp-model.SAML-ACSURL')}>
        <Input
          value={`https://${identity?.authConfig?.userpool.oauth.domain}/saml2/idpresponse`}
          readOnly/>
      </FormField>
      <FormField label={t('common.tenant-idp-model.SAML-applicationURN')}>
        <Input
          value={`urn:amazon:cognito:sp:${identity?.authConfig?.userpool.userPoolId}`}
          readOnly/>
      </FormField>
      <FormField label={t('common.tenant-idp-model.SAML-metadata')}>
        <RadioGroup
          onChange={({ detail }) => {
            if(detail.value === "URL") {
              onChange({ MetadataURL: "" })
            } else {
              onChange({ MetadataFile: "" })
            }
          }}
          value={providerDetails.MetadataURL !== undefined ? 'URL' : 'FILE'}
          items={[
            { value: "URL", label: t('common.tenant-idp-model.SAML-URL') },
            { value: "FILE", label: t('common.tenant-idp-model.SAML-FILE') }
          ]}
        />
        {providerDetails.MetadataURL !== undefined ?
          <Input
            value={providerDetails.MetadataURL ?? ""}
            placeholder='https://<METADATA_URL>/'
            onChange={(event: any) => onChange({
              MetadataURL: event.detail.value
            })}
          />
          :
          <Textarea value={providerDetails.MetadataFile ?? ""}
            onChange={(event: any) => onChange({
              MetadataFile: event.detail.value
            })}
            rows={8}
          />
        }
      </FormField>
    </>
  )
}