/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useState, useEffect } from "react";
import { observer } from "mobx-react";
// plane imports
import type { ISearchIssueResponse, TIssue } from "@plane/types";
// components
import { IssueModalContext } from "@/components/issues/issue-modal/context";
import type { THandleTemplateChangeProps } from "@/components/issues/issue-modal/context";
// hooks
import { useUser } from "@/hooks/store/user/user-user";
// helpers
import { applyWorkItemTemplate } from "@/helpers/work-item-template.helper";

export type TIssueModalProviderProps = {
  templateId?: string;
  dataForPreload?: Partial<TIssue>;
  allowedProjectIds?: string[];
  children: React.ReactNode;
};

export const IssueModalProvider = observer(function IssueModalProvider(props: TIssueModalProviderProps) {
  const { children, allowedProjectIds } = props;
  // states
  const [selectedParentIssue, setSelectedParentIssue] = useState<ISearchIssueResponse | null>(null);
  const [workItemTemplateId, setWorkItemTemplateId] = useState<string | null>(props.templateId ?? null);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // store hooks
  const { projectsWithCreatePermissions } = useUser();
  // derived values
  const projectIdsWithCreatePermissions = Object.keys(projectsWithCreatePermissions ?? {});

  useEffect(() => {
    setWorkItemTemplateId(props.templateId ?? null);
  }, [props.templateId]);

  const handleTemplateChange = async (props: THandleTemplateChangeProps) => {
    const { workspaceSlug, projectId, getValues, setValue, editorRef } = props;
    if (!workItemTemplateId || !workspaceSlug || !projectId) return;

    setIsApplyingTemplate(true);
    try {
      const { description } = await applyWorkItemTemplate({
        workspaceSlug,
        projectId,
        templateId: workItemTemplateId,
        getValues,
        setValue,
      });

      if (description && editorRef.current) {
        editorRef.current.setEditorValue(description);
      }
    } catch (error) {
      console.error("Failed to apply template", error);
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  return (
    <IssueModalContext.Provider
      // oxlint-disable-next-line react/jsx-no-constructed-context-values
      value={{
        allowedProjectIds: allowedProjectIds ?? projectIdsWithCreatePermissions,
        workItemTemplateId,
        setWorkItemTemplateId,
        isApplyingTemplate,
        setIsApplyingTemplate,
        selectedParentIssue,
        setSelectedParentIssue,
        issuePropertyValues: {},
        setIssuePropertyValues: () => {},
        issuePropertyValueErrors: {},
        setIssuePropertyValueErrors: () => {},
        getIssueTypeIdOnProjectChange: () => null,
        getActiveAdditionalPropertiesLength: () => 0,
        handlePropertyValuesValidation: () => true,
        handleCreateUpdatePropertyValues: () => Promise.resolve(),
        handleProjectEntitiesFetch: () => Promise.resolve(),
        handleTemplateChange,
        handleConvert: () => Promise.resolve(),
        handleCreateSubWorkItem: () => Promise.resolve(),
      }}
    >
      {children}
    </IssueModalContext.Provider>
  );
});
