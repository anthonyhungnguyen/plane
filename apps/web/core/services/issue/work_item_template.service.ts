import { API_BASE_URL } from "@plane/constants";
import type { TIssue, TWorkItemTemplate } from "@plane/types";
import { APIService } from "@/services/api.service";

export type TemplatePayload = Partial<
  Pick<
    TIssue,
    | "name"
    | "description"
    | "description_html"
    | "state_id"
    | "priority"
    | "assignee_ids"
    | "label_ids"
    | "module_ids"
    | "estimate_point"
    | "cycle_id"
    | "parent_id"
    | "start_date"
    | "target_date"
    | "type_id"
  >
>;

export type TemplateUseResponse = {
  template: TWorkItemTemplate;
  payload?: TemplatePayload | null;
  description_html?: string;
  name?: string;
};

const isWorkItemTemplate = (value: unknown): value is TWorkItemTemplate =>
  Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    "name" in value &&
    "description_html" in value &&
    "project" in value &&
    "workspace" in value
  );

const isTemplateUseResponse = (value: unknown): value is TemplateUseResponse => {
  if (!value || typeof value !== "object") return false;
  if (!("template" in value)) return false;

  const template = (value as { template?: unknown }).template;
  if (!isWorkItemTemplate(template)) return false;

  const payload = (value as { payload?: unknown }).payload;
  if (payload !== undefined && payload !== null && typeof payload !== "object") return false;

  return true;
};

export class WorkItemTemplateService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async listTemplates(workspaceSlug: string, projectId: string): Promise<TWorkItemTemplate[]> {
    const response = await this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-templates/`);
    const templates: unknown = response?.data;

    if (!Array.isArray(templates)) return [];

    return templates.filter(isWorkItemTemplate);
  }

  async createTemplate(
    workspaceSlug: string,
    projectId: string,
    payload: Partial<TWorkItemTemplate>
  ): Promise<TWorkItemTemplate> {
    const response = await this.post(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-templates/`,
      payload
    );
    const template: unknown = response?.data;

    if (!isWorkItemTemplate(template)) throw new Error("Invalid work item template response");

    return template;
  }

  async updateTemplate(
    workspaceSlug: string,
    projectId: string,
    templateId: string,
    payload: Partial<TWorkItemTemplate>
  ): Promise<TWorkItemTemplate> {
    const response = await this.patch(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-templates/${templateId}/`,
      payload
    );

    const template: unknown = response?.data;

    if (!isWorkItemTemplate(template)) throw new Error("Invalid work item template response");

    return template;
  }

  async deleteTemplate(workspaceSlug: string, projectId: string, templateId: string): Promise<void> {
    await this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-templates/${templateId}/`);
  }

  async useTemplate(workspaceSlug: string, projectId: string, templateId: string): Promise<TemplateUseResponse> {
    const response = await this.post(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-templates/${templateId}/use/`,
      {}
    );
    const data: unknown = response?.data;

    if (!isTemplateUseResponse(data)) throw new Error("Invalid work item template response");

    return data;
  }
}
