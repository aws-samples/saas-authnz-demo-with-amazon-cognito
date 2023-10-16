permit (
    principal,
    action == ApiAccess::Action::"UpdateUserProfile",
    resource
)
when {
    resource.pathParameters has userId &&
    resource.pathParameters.userId == principal.sub
};