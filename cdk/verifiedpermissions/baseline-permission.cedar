permit (
    principal,
    action in [
        ApiAccess::Action::"ListUser",
        ApiAccess::Action::"DescribeUser",
        ApiAccess::Action::"DescribeTenantInfo"
    ],
    resource
);