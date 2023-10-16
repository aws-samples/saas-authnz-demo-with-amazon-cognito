forbid (
    principal,
    action in [
        ApiAccess::Action::"UpdateUserRole",
        ApiAccess::Action::"DeleteUser"
    ],
    resource
)
when {
    resource.pathParameters has userId &&
    resource.pathParameters.userId == principal.sub
};