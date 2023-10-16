// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import "@cloudscape-design/global-styles/index.css"
import { ContentLayout, Spinner, TopNavigation, AppLayout } from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuthService } from "../service/AuthService";

export default function AuthLayout({ children, header }: {
  children: React.ReactNode,
  header: React.ReactNode
}) {
  const { identity, loading, signOut } = useAuthService();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const onMenuClick = ({ detail }: { detail: { id: string }}) => {
    switch(detail.id) {
      case 'profile':
        navigate('/');
        return
      case 'signOut':
        signOut();
        return
    }
  }
  return (
    loading ? <Spinner/>
      :
    <>
      <header id="header" style={{ position: 'sticky', top: 0, zIndex: 1002 }}>
        <TopNavigation
          identity={{
            title: "Demo App",
            href: "/"
          }}
          i18nStrings={{
            searchIconAriaLabel: "Search",
            searchDismissIconAriaLabel: "Close search",
            overflowMenuTriggerText: "More",
            overflowMenuTitleText: "All",
            overflowMenuBackIconAriaLabel: "Back",
            overflowMenuDismissIconAriaLabel: "Close menu"
          }}
          utilities={[
            {
              type: "button",
              text: identity?.tenantInfo?.tenantName,
              onClick: () => {navigate("/tenant")}
            },
            
            {
              type: "menu-dropdown",
              text: identity?.myProfile?.displayName,
              description: identity?.myProfile?.email,
              iconName: "user-profile",
              items: [
                { id: "profile", text: t('top-nav.menu.profile') },
                { id: "signOut", text: t('top-nav.menu.signOut') }
              ],
              onItemClick: onMenuClick
            }
          ]}
        ></TopNavigation>
      </header>
      <div className="AuthLayout">
        <AppLayout 
          content={
            <ContentLayout header={header}>
              {children}
            </ContentLayout>
          }
          headerSelector="#header"
          toolsHide={true} navigationHide={true}
        ></AppLayout>
      </div>
    </>
  )
}