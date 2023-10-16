forbid (
    principal,
    action in [
        ApiAccess::Action::"CreateIdpMapping",
        ApiAccess::Action::"UpdateIdpMapping"
    ],
    resource
)
when {
    principal.tenantTier != "PREMIUM"
};