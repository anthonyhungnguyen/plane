import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useParams } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { Loader, CustomSelect } from "@plane/ui";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TIssue, TWorkItemTemplate } from "@plane/types";
import type { EditorRefApi } from "@plane/editor";
import { applyWorkItemTemplate } from "@/helpers/work-item-template.helper";
import { useIssueModal } from "@/hooks/context/use-issue-modal";
import { WorkItemTemplateService } from "@/services/issue";

export type TWorkItemTemplateDropdownSize = "xs" | "sm";

export type TWorkItemTemplateSelect = {
  projectId: string | null;
  typeId: string | null;
  defaultTemplateId?: string | null;
  shouldAutoApplyDefault?: boolean;
  disabled?: boolean;
  size?: TWorkItemTemplateDropdownSize;
  placeholder?: string;
  renderChevron?: boolean;
  dropDownContainerClassName?: string;
  handleModalClose: () => void;
  handleFormChange?: () => void;
  editorRef?: React.MutableRefObject<EditorRefApi | null>;
};

const templateService = new WorkItemTemplateService();

export const WorkItemTemplateSelect = (props: TWorkItemTemplateSelect) => {
  const {
    projectId,
    disabled,
    placeholder = "Templates",
    handleFormChange,
    defaultTemplateId,
    shouldAutoApplyDefault,
    editorRef,
  } = props;
  const { workspaceSlug } = useParams();
  const { setValue, getValues } = useFormContext<TIssue>();
  const { setWorkItemTemplateId, setIsApplyingTemplate } = useIssueModal();
  const [templates, setTemplates] = useState<TWorkItemTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [hasAutoApplied, setHasAutoApplied] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const workspaceSlugString = useMemo(() => workspaceSlug?.toString() ?? "", [workspaceSlug]);

  useEffect(() => {
    if (!workspaceSlugString || !projectId) return;
    setIsLoading(true);
    void templateService
      .listTemplates(workspaceSlugString, projectId)
      .then((data) => {
        setTemplates(data ?? []);
        return;
      })
      .catch(() =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Unable to load templates.",
        })
      )
      .finally(() => setIsLoading(false));
  }, [workspaceSlugString, projectId]);

  useEffect(() => {
    setHasAutoApplied(false);
    setSelectedTemplateId("");
  }, [projectId, defaultTemplateId]);

  useEffect(() => {
    if (
      !workspaceSlugString ||
      !projectId ||
      !defaultTemplateId ||
      !shouldAutoApplyDefault ||
      isLoading ||
      isApplying ||
      hasAutoApplied
    )
      return;

    const targetTemplate = templates.find((template) => template.id === defaultTemplateId && template.is_active);

    if (!targetTemplate) return;

    void applyTemplate(defaultTemplateId, {
      showToast: false,
      preserveExistingValues: true,
    })
      .then(() => setHasAutoApplied(true))
      .catch(() => setHasAutoApplied(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    workspaceSlugString,
    projectId,
    defaultTemplateId,
    shouldAutoApplyDefault,
    isLoading,
    isApplying,
    hasAutoApplied,
    templates,
  ]);

  const applyTemplate = async (
    templateId: string,
    { showToast = true, preserveExistingValues = false }: { showToast?: boolean; preserveExistingValues?: boolean } = {}
  ) => {
    if (!workspaceSlugString || !projectId) return;

    setIsApplying(true);
    setIsApplyingTemplate(true);
    try {
      const { description } = await applyWorkItemTemplate({
        workspaceSlug: workspaceSlugString,
        projectId,
        templateId,
        getValues,
        setValue,
        handleFormChange,
        preserveExistingValues,
        templateService,
      });

      if (description && editorRef?.current) {
        editorRef.current.setEditorValue(description);
      }

      setSelectedTemplateId(templateId);
      setWorkItemTemplateId(templateId);

      if (showToast) {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Template applied",
          message: "Fields have been pre-filled from the template.",
        });
      }
    } catch {
      if (showToast) {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Unable to apply template.",
        });
      }
    } finally {
      setIsApplying(false);
      setIsApplyingTemplate(false);
    }
  };

  if (!projectId || !workspaceSlugString) return null;

  if (isLoading)
    return (
      <Loader className="h-9 w-9">
        <Loader.Item className="h-full w-full" />
      </Loader>
    );

  if (!templates.length) return null;

  return (
    <CustomSelect
      value={selectedTemplateId}
      onChange={(value: string) => {
        setSelectedTemplateId(value);
        if (value) void applyTemplate(value);
      }}
      label={
        <div className="flex items-center gap-2 text-custom-text-200 hover:text-custom-text-100">
          <LayoutTemplate className="h-4 w-4" />
          <span className="text-xs font-medium">{placeholder}</span>
        </div>
      }
      input
      disabled={disabled || isApplying}
      placement="bottom-end"
      noChevron={!props.renderChevron}
    >
      {templates.map((template) => (
        <CustomSelect.Option key={template.id} value={template.id}>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{template.name}</span>
            {template.description && (
              <span className="text-xs text-custom-text-200 line-clamp-1">{template.description}</span>
            )}
          </div>
        </CustomSelect.Option>
      ))}
    </CustomSelect>
  );
};
