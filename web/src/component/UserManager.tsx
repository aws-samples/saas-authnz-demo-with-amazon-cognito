// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect } from 'react';
import { 
  Table, Box, Pagination, Button, Header, TextFilter, SpaceBetween, ButtonDropdown
} from '@cloudscape-design/components';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { useTranslation, Trans } from 'react-i18next';
import { getTenantUsers, UserProfile } from '../api/TenantUserService';
import { useAuthService } from '../service/AuthService';
import { InviteUserModal } from './InviteUserModal';
import { UpdateUserRoleModal } from './UpdateUserModal';
import { DeleteUserModal } from './DeleteUserModal';

const MODAL_OPTIONS = {
  INVITE_USER: 'INVITE_USER',
  DELETE_USER: 'DELETE_USER',
  UPDATE_USER_ROLE: 'UPDATE_USER_ROLE',
  NONE: 'NONE'
} as const
type ModalOption = typeof MODAL_OPTIONS[keyof typeof MODAL_OPTIONS]

export default function UserManager() {
  const [activeModal, setActiveModal] = useState<ModalOption>(MODAL_OPTIONS.NONE);
  const [tenantUsers, setTenantUsers] = useState<UserProfile[]|undefined>(undefined);
  const { identity } = useAuthService();
  const { t } = useTranslation();
  useEffect(() => {
    getTenantUsers(identity!.idToken).then((users) => {
      setTenantUsers(users);
    })
  }, [identity])

  // when component loaded
  const { items, collectionProps, filterProps, paginationProps } = useCollection(
    tenantUsers ?? [],
    {
      pagination: { pageSize: 10 },
      sorting: {},
      selection: {},
      filtering: {},
    }
  );
  const { selectedItems } = collectionProps;

  // https://cloudscape.design/get-started/dev-guides/collection-hooks/
  return (
    <>
      <Table
        {...collectionProps}
        header={
          <Header
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <ButtonDropdown
                disabled={!tenantUsers}
                items={[
                  {
                    text: t('user-manager.menu.changeRole'),
                    id: "changeRole",
                    disabled: selectedItems?.length !== 1 
                  },
                  {
                    text: t('user-manager.menu.deleteUser'),
                    id: "deleteUser",
                    disabled: !selectedItems || selectedItems?.length < 1 
                  }
                ]}
                onItemClick={(event) => { 
                  switch(event.detail.id) {
                    case 'changeRole':
                      setActiveModal(MODAL_OPTIONS.UPDATE_USER_ROLE);
                      break
                    case 'deleteUser':
                      setActiveModal(MODAL_OPTIONS.DELETE_USER);
                      break
                  }
                }}
              >
                <Trans
                  i18nKey="user-manager.menu.manageUser"
                />
              </ButtonDropdown>
              <Button
                variant="primary"
                onClick={() => {setActiveModal(MODAL_OPTIONS.INVITE_USER)}}
                disabled={!tenantUsers}
              >
                <Trans
                  i18nKey="user-manager.menu.inviteUser"
                />
              </Button>
            </SpaceBetween>
          }
        >
          <Trans
            i18nKey="user-manager.header.text"
          />
        </Header>
        }
        filter={<TextFilter
                {...filterProps}
                filteringPlaceholder={t('common.table.filteringPlaceholder')}
              />}
        pagination={<Pagination {...paginationProps}/>}
        items={items}
        selectionType="multi"
        loading={!tenantUsers}
        loadingText={t('common.loading.text')}
        resizableColumns
        columnDefinitions={[
          {
            header: t('common.profile-model.displayName'),
            cell: item => item.displayName,
            sortingField: "displayName",
          },
          {
            header: t('common.profile-model.email'),
            cell: item => item?.email,
            sortingField: "email",
          },
          {
            header: t('common.profile-model.role'),
            cell: item => item.role,
            sortingField: "role",
          },
          {
            header: t('common.profile-model.type'),
            cell: item => {
              return item.type === 'NATIVE_USER' ? 
                t(`common.profile-model.nativeUserType`)
              :
                t(`common.profile-model.federationUserType`);
            },
          },
          {
            header: t('common.profile-model.userId'),
            cell: item => item.userId,
          },
        ]}
        empty={
          <Box textAlign="center" color="inherit">
            <Trans
              i18nKey="user-manager.table.empty"
            >
            </Trans>
          </Box>
        }
      />
      <InviteUserModal
        visible={activeModal === MODAL_OPTIONS.INVITE_USER}
        onDismiss={() => {setActiveModal(MODAL_OPTIONS.NONE)}}
        onSubmit={(user) => {
          setTenantUsers([...tenantUsers ?? [], user]);
        }}
      />
      {(selectedItems && selectedItems.length >= 1) &&
        <UpdateUserRoleModal
          visible={activeModal === MODAL_OPTIONS.UPDATE_USER_ROLE}
          onDismiss={() => {setActiveModal(MODAL_OPTIONS.NONE)}}
          onSubmit={(user) => {
            setTenantUsers([
              ...(tenantUsers ?? []).filter((item) => item.userId !== user.userId),
              user
            ]);
          }}
          target={selectedItems[0]}
        />
      }
      <DeleteUserModal
        visible={activeModal === MODAL_OPTIONS.DELETE_USER}
        onDismiss={() => {setActiveModal(MODAL_OPTIONS.NONE)}}
        onSubmit={(deletedUsers) => {
          const deletedIds = new Set(deletedUsers.map(item => item.userId));
          setTenantUsers(tenantUsers?.filter((item) => !deletedIds.has(item.userId)));
        }}
        targets={[...(selectedItems ?? [])]}
      />
    </>
  )
}