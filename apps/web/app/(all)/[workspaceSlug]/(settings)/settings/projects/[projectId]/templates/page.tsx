import { observer } from "mobx-react";
// components
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
import { ProjectTemplatesList } from "@/components/projects/settings/templates-list";
import type { Route } from "./+types/page";

const TemplatesSettingsPage = observer(function TemplatesSettingsPage({ params }: Route.ComponentProps) {
  const { workspaceSlug, projectId } = params;
  // store
  const { workspaceUserInfo, allowPermissions } = useUserPermissions();

  const { currentProjectDetails } = useProject();
  // derived values
  const pageTitle = currentProjectDetails?.name ? `${currentProjectDetails?.name} - Templates` : undefined;
  const canManageTemplates = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  if (workspaceUserInfo && !canManageTemplates) {
    return <NotAuthorizedView section="settings" isProjectView className="h-auto" />;
  }

  return (
    <SettingsContentWrapper>
      <PageHead title={pageTitle} />
      <section className={`w-full ${canManageTemplates ? "" : "opacity-60"}`}>
        <ProjectTemplatesList workspaceSlug={workspaceSlug} projectId={projectId} isAdmin={canManageTemplates} />
      </section>
    </SettingsContentWrapper>
  );
});

export default TemplatesSettingsPage;
