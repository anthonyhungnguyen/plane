/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// component
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// helpers
import { IS_BILLING_FEATURE_ENABLED } from "@/helpers/feature-flags";
// local imports
import { BillingWorkspaceSettingsHeader } from "./header";
import { BillingRoot } from "@/components/workspace/billing";

function BillingSettingsPage() {
  // router
  const router = useAppRouter();
  const { workspaceSlug } = useParams();
  // store hooks
  const { workspaceUserInfo, allowPermissions } = useUserPermissions();
  const { currentWorkspace } = useWorkspace();
  // derived values
  const canPerformWorkspaceAdminActions = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace.name} - Billing & Plans` : undefined;
  const workspaceSlugParam = workspaceSlug?.toString();

  useEffect(() => {
    if (!IS_BILLING_FEATURE_ENABLED && workspaceSlugParam) {
      router.replace(`/${workspaceSlugParam}/settings`);
    }
  }, [router, workspaceSlugParam]);

  if (!IS_BILLING_FEATURE_ENABLED) return null;

  if (workspaceUserInfo && !canPerformWorkspaceAdminActions) {
    return <NotAuthorizedView section="settings" className="h-auto" />;
  }

  return (
    <SettingsContentWrapper header={<BillingWorkspaceSettingsHeader />} hugging>
      <PageHead title={pageTitle} />
      <BillingRoot />
    </SettingsContentWrapper>
  );
}

const BillingSettingsPageComponent = observer(BillingSettingsPage);

export default BillingSettingsPageComponent;
