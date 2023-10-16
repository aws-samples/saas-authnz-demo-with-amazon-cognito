// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState } from 'react';
import { 
  Box, Button, SpaceBetween,Modal, TextContent, Flashbar, FlashbarProps
} from '@cloudscape-design/components';
import { useTranslation, Trans } from 'react-i18next';
import { UserProfile, deleteTenantUser } from '../api/TenantUserService';
import { useAuthService } from '../service/AuthService';

export function DeleteUserModal({ visible, targets, onDismiss, onSubmit }: { 
  visible: boolean, 
  targets: UserProfile[], 
  onDismiss: () => void, 
  onSubmit: (users: UserProfile[]) => void 
}) {
  const { identity } = useAuthService();
  const [deletedUsers, setDeletedUsers] = useState<UserProfile[]>([]);
  const [errors, setErrors] = useState<{user: UserProfile, reason: string}[]>([]);
  const { t } = useTranslation();

  const closeModal = () => {
    setDeletedUsers([]);
    setErrors([]);
    onDismiss();
  }
  const onDelete = async () => {
    const requests = targets.map((user) => deleteTenantUser({
      userId: user.userId
    }, identity?.idToken ?? ""))
    const results = await Promise.allSettled(requests);
    const deletedUsers = targets.filter((_, index) => {
      return results[index].status === "fulfilled";
    });
    const errors = targets.filter((_, index) => {
      return results[index].status === "rejected";
    }).map((item, index) => {
      const error = (results[index] as PromiseRejectedResult).reason as Error;
      return {user: item, reason: error.message}
    })
    onSubmit(deletedUsers);
    setDeletedUsers(deletedUsers);
    setErrors(errors);
  }
  const submitResults = [
    ...errors.map(error => {
      return {
        type: "error" as FlashbarProps.Type,
        content: t('user-manager.modal.deleteUserFailed', {
          displayName: error.user.displayName,
          email: error.user.email,
          reason: error.reason
        }),
        dismissable: false
      }}),
    ...deletedUsers.map(user => {
      return {
        type: "success" as FlashbarProps.Type,
        content: t('user-manager.modal.deleteUserSucceeded', {
          displayName: user.displayName,
          email: user.email
        }),
        dismissable: false
      }})
  ]
  return (
    <Modal
      visible={visible}
      onDismiss={closeModal}
      closeAriaLabel={t('common.modal.close')}
      header={t('user-manager.menu.deleteUser')}
      footer={(
        <Box float="right">
          {submitResults.length === 0 ? 
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={closeModal}>
                <Trans
                  i18nKey="common.modal.cancel"
                />
              </Button>
              <Button variant="primary" onClick={onDelete}>
                <Trans
                  i18nKey="user-manager.modal.submitDeleteUser"
                />
              </Button>
            </SpaceBetween>
          :
            <Button variant="primary" onClick={closeModal}>
              <Trans
                i18nKey="common.modal.ok"
              />
            </Button>
          }
        </Box>
      )}
    >
      {submitResults.length === 0 ? 
        <TextContent>
          <Trans
            i18nKey="user-manager.modal.confirmDeleteUser"
          />
          <ul>
            {targets.map(target => (
              <li key={target.userId}>{target.displayName} ({target.email})</li>
            ))}
          </ul>
        </TextContent>
      :
        <Flashbar items={submitResults}/>
      }
    </Modal>
  )
}