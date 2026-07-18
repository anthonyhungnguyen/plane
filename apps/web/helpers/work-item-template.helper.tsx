import isEqual from "lodash-es/isEqual";
import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import { DEFAULT_WORK_ITEM_FORM_VALUES } from "@plane/constants";
import type { TIssue } from "@plane/types";
import { WorkItemTemplateService } from "@/services/issue";
import type { TemplatePayload, TemplateUseResponse } from "@/services/issue/work_item_template.service";

export const markdownToHtml = (value: string): string => {
  if (!value) return "<p></p>";
  // Lightweight markdown fallback to avoid heavy dependencies
  const escaped = value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const withBreaks = escaped.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>");
  return `<p>${withBreaks}</p>`;
};

const isDescriptionEmpty = (value: unknown): boolean => {
  if (typeof value !== "string") return true;
  const stripped = value.replace(/<[^>]*>/g, "").trim();
  return stripped.length === 0;
};

const hasMeaningfulValue = (key: keyof TIssue, value: unknown): boolean => {
  const defaultValue = (DEFAULT_WORK_ITEM_FORM_VALUES as Record<string, unknown>)[key];

  if (value === null || value === undefined) return false;

  if (key === "description_html") return !isDescriptionEmpty(value);

  if (Array.isArray(value)) return value.length > 0;

  if (typeof value === "string") {
    const trimmed = value.trim();
    const defaultTrimmed = typeof defaultValue === "string" ? defaultValue.trim() : defaultValue;

    if (!trimmed) return false;
    return defaultTrimmed !== undefined ? trimmed !== defaultTrimmed : true;
  }

  return defaultValue !== undefined ? !isEqual(value, defaultValue) : value !== undefined;
};

type ApplyWorkItemTemplateParams = {
  workspaceSlug: string;
  projectId: string;
  templateId: string;
  getValues: UseFormGetValues<TIssue>;
  setValue: UseFormSetValue<TIssue>;
  handleFormChange?: () => void;
  preserveExistingValues?: boolean;
  templateService?: WorkItemTemplateService;
};

export const applyWorkItemTemplate = async ({
  workspaceSlug,
  projectId,
  templateId,
  getValues,
  setValue,
  handleFormChange,
  preserveExistingValues = false,
  templateService,
}: ApplyWorkItemTemplateParams) => {
  const service = templateService ?? new WorkItemTemplateService();
  const response = await service.useTemplate(workspaceSlug, projectId, templateId);

  const payload: TemplatePayload = response?.payload ?? {};
  const template = response?.template as TemplateUseResponse["template"] | undefined;

  const rawDescription =
    response?.description_html ??
    payload?.description_html ??
    payload?.description ??
    template?.description_html ??
    template?.description ??
    "";

  const descriptionText = typeof rawDescription === "string" ? rawDescription : "";
  const description = descriptionText.includes("<") ? descriptionText : markdownToHtml(descriptionText);

  const allowedKeys: (keyof TIssue)[] = [
    "name",
    "description_html",
    "state_id",
    "priority",
    "assignee_ids",
    "label_ids",
    "module_ids",
    "estimate_point",
    "cycle_id",
    "parent_id",
    "start_date",
    "target_date",
    "type_id",
  ];

  allowedKeys.forEach((key) => {
    const currentValue = getValues(key);
    const shouldPreserve = preserveExistingValues && hasMeaningfulValue(key, currentValue);

    if (shouldPreserve) return;

    const nextValue =
      key === "description_html"
        ? description
        : (payload[key as keyof TemplatePayload] ?? (key === "name" ? template?.name : undefined) ?? currentValue);

    if (nextValue !== undefined) {
      setValue(key, nextValue as TIssue[typeof key], { shouldDirty: true, shouldValidate: false });
    }
  });

  handleFormChange?.();

  return { templateId, template, payload, description };
};
