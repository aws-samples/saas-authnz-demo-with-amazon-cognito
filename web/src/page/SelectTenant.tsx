// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, TextField } from "@aws-amplify/ui-react";
import UnauthLayout from "../layout/UnauthLayout";

export default function SelectTenant() {
  const [tenantId, setTenantId] = useState("");
  const navigate = useNavigate();
  return (
    <UnauthLayout>
      <form>
        <TextField
          label=""
          placeholder="Tenant ID"
          onChange={(event: any) => setTenantId(event.target.value)}
          value={tenantId}
          outerEndComponent={
            <Button
              type="submit"
              variation="primary"
              onClick={(e) => {e.preventDefault(); navigate(`/login/${tenantId}`)}}
              disabled={tenantId === ""}
            >→</Button>
          }
        />
      </form>
    </UnauthLayout>
  )
}