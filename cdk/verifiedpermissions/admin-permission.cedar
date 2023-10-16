permit (
    principal,
    action in [
        ApiAccess::Action::"UpdateTenantInfo",
        ApiAccess::Action::"InviteUser",
        ApiAccess::Action::"UpdateUserProfile",
        ApiAccess::Action::"UpdateUserRole",
        ApiAccess::Action::"DeleteUser",
        ApiAccess::Action::"CreateIdpMapping",
        ApiAccess::Action::"UpdateIdpMapping",
        ApiAccess::Action::"DescribeIdpMapping",
        ApiAccess::Action::"DeleteIdpMapping"
    ],
    resource
)
when {
    principal.userRole == "admin"
};