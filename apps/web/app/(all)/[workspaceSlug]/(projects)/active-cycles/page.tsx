/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// components
import { PageHead } from "@/components/core/page-title";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
import { useWorkspace } from "@/hooks/store/use-workspace";
// helpers
import { IS_BILLING_FEATURE_ENABLED } from "@/helpers/feature-flags";
// local imports
import { WorkspaceActiveCyclesUpgrade } from "@/components/active-cycles/workspace-active-cycles-upgrade";

function WorkspaceActiveCyclesPage() {
  const router = useAppRouter();
  const { workspaceSlug } = useParams();
  const { currentWorkspace } = useWorkspace();
  // derived values
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace?.name} - Active Cycles` : undefined;
  const workspaceSlugParam = workspaceSlug?.toString();

  useEffect(() => {
    if (!IS_BILLING_FEATURE_ENABLED && workspaceSlugParam) {
      router.replace(`/${workspaceSlugParam}`);
    }
  }, [router, workspaceSlugParam]);

  if (!IS_BILLING_FEATURE_ENABLED) return null;

  return (
    <>
      <PageHead title={pageTitle} />
      <WorkspaceActiveCyclesUpgrade />
    </>
  );
}

const WorkspaceActiveCyclesPageComponent = observer(WorkspaceActiveCyclesPage);

export default WorkspaceActiveCyclesPageComponent;
