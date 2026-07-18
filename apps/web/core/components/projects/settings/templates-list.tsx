import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Pencil, Trash2 } from "lucide-react";
// plane imports
import { Button, Tooltip, AlertModalCore, Badge } from "@plane/ui";
import type { TWorkItemTemplate } from "@plane/types";
// components
import { SettingsHeading } from "@/components/settings/heading";
// hooks
import { useWorkItemTemplate } from "@/hooks/store/use-work-item-template";
import { useProject } from "@/hooks/store/use-project";
// components
import { CreateUpdateTemplateModal } from "./create-update-template-modal";

type Props = {
  workspaceSlug: string;
  projectId: string;
  isAdmin: boolean;
};

export const ProjectTemplatesList = observer((props: Props) => {
  const { workspaceSlug, projectId, isAdmin } = props;
  const { fetchTemplates, projectTemplates, createTemplate, updateTemplate, deleteTemplate } = useWorkItemTemplate();
  const { currentProjectDetails, updateProject } = useProject();

  const [createUpdateModalOpen, setCreateUpdateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TWorkItemTemplate | undefined>(undefined);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceSlug && projectId) {
      void fetchTemplates(workspaceSlug, projectId);
    }
  }, [workspaceSlug, projectId, fetchTemplates]);

  const handleCloseModal = () => {
    setCreateUpdateModalOpen(false);
    setSelectedTemplate(undefined);
  };

  const handleCreate = async (data: Partial<TWorkItemTemplate>) => {
    await createTemplate(workspaceSlug, projectId, data);
  };

  const handleUpdate = async (data: Partial<TWorkItemTemplate>) => {
    if (!selectedTemplate) return;
    await updateTemplate(workspaceSlug, projectId, selectedTemplate.id, data);
  };

  const handleDeleteClick = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate(workspaceSlug, projectId, templateToDelete);
      setDeleteModalOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleSetDefault = async (templateId: string) => {
    if (!workspaceSlug || !projectId) return;
    try {
      await updateProject(workspaceSlug, projectId, {
        default_work_item_template: templateId,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <CreateUpdateTemplateModal
        isOpen={createUpdateModalOpen}
        handleClose={handleCloseModal}
        data={selectedTemplate}
        onSubmit={selectedTemplate ? handleUpdate : handleCreate}
        workspaceSlug={workspaceSlug}
        projectId={projectId}
      />
      <AlertModalCore
        isOpen={deleteModalOpen}
        handleClose={() => {
          setDeleteModalOpen(false);
          setTemplateToDelete(null);
        }}
        handleSubmit={() => {
          void handleConfirmDelete();
        }}
        title="Delete Template"
        content="Are you sure you want to delete this template? This action cannot be undone."
        isSubmitting={false}
        variant="danger"
        primaryButtonText={{
          default: "Delete",
          loading: "Deleting...",
        }}
      />
      <div className="space-y-6">
        <SettingsHeading
          title="Templates"
          description="Manage templates for your project."
          button={
            isAdmin
              ? {
                  label: "Create Template",
                  onClick: () => {
                    setSelectedTemplate(undefined);
                    setCreateUpdateModalOpen(true);
                  },
                }
              : undefined
          }
        />
        <div className="flex flex-col">
          {projectTemplates?.map((template) => {
            const isDefault = currentProjectDetails?.default_work_item_template === template.id;
            return (
              <div
                key={template.id}
                className="flex items-center justify-between gap-x-8 gap-y-2 border-b border-subtle bg-surface-1 py-4 group"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-13 font-medium leading-5">{template.name}</h4>
                    {isDefault && (
                      <Badge variant="neutral" size="sm">
                        Default
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-13 leading-5 tracking-tight text-tertiary line-clamp-1">
                      {template.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isDefault && isAdmin && (
                    <Button
                      variant="neutral-primary"
                      size="sm"
                      onClick={() => {
                        void handleSetDefault(template.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Set as Default
                    </Button>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip tooltipContent="Edit Template">
                        <button
                          type="button"
                          className="p-1.5 hover:bg-custom-background-80 rounded text-custom-text-200 hover:text-custom-text-100"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setCreateUpdateModalOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip tooltipContent="Delete Template">
                        <button
                          type="button"
                          className="p-1.5 hover:bg-red-500/10 rounded text-custom-text-200 hover:text-red-600"
                          onClick={() => handleDeleteClick(template.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {projectTemplates?.length === 0 && (
            <div className="text-center text-custom-text-200 py-8">No templates found.</div>
          )}
        </div>
      </div>
    </>
  );
});
