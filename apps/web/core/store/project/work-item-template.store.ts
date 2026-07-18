import { observable, action, makeObservable, runInAction, computed } from "mobx";
import { set } from "lodash-es";
// plane types
import type { TWorkItemTemplate } from "@plane/types";
// services
import { WorkItemTemplateService } from "@/services/issue";
import type { TemplateUseResponse } from "@/services/issue/work_item_template.service";
// store
import type { CoreRootStore } from "../root.store";

export interface IWorkItemTemplateStore {
  // observables
  templates: Record<string, TWorkItemTemplate>;
  // computed
  projectTemplates: TWorkItemTemplate[];
  // actions
  fetchTemplates: (workspaceSlug: string, projectId: string) => Promise<TWorkItemTemplate[]>;
  createTemplate: (
    workspaceSlug: string,
    projectId: string,
    payload: Partial<TWorkItemTemplate>
  ) => Promise<TWorkItemTemplate>;
  updateTemplate: (
    workspaceSlug: string,
    projectId: string,
    templateId: string,
    payload: Partial<TWorkItemTemplate>
  ) => Promise<TWorkItemTemplate>;
  deleteTemplate: (workspaceSlug: string, projectId: string, templateId: string) => Promise<void>;
  useTemplate: (workspaceSlug: string, projectId: string, templateId: string) => Promise<TemplateUseResponse>;
  getTemplateById: (templateId: string) => TWorkItemTemplate | undefined;
}

export class WorkItemTemplateStore implements IWorkItemTemplateStore {
  // observables
  templates: Record<string, TWorkItemTemplate> = {};
  // services
  workItemTemplateService: WorkItemTemplateService;
  // root store
  rootStore: CoreRootStore;

  constructor(rootStore: CoreRootStore) {
    makeObservable(this, {
      templates: observable,
      projectTemplates: computed,
      fetchTemplates: action,
      createTemplate: action,
      updateTemplate: action,
      deleteTemplate: action,
      useTemplate: action,
    });
    this.workItemTemplateService = new WorkItemTemplateService();
    this.rootStore = rootStore;
  }

  get projectTemplates() {
    return Object.values(this.templates);
  }

  getTemplateById = (templateId: string) => this.templates[templateId];

  fetchTemplates = async (workspaceSlug: string, projectId: string) => {
    const response = await this.workItemTemplateService.listTemplates(workspaceSlug, projectId);
    runInAction(() => {
      response.forEach((template) => {
        set(this.templates, template.id, template);
      });
    });
    return response;
  };

  createTemplate = async (workspaceSlug: string, projectId: string, payload: Partial<TWorkItemTemplate>) => {
    const response = await this.workItemTemplateService.createTemplate(workspaceSlug, projectId, payload);
    runInAction(() => {
      set(this.templates, response.id, response);
    });
    return response;
  };

  updateTemplate = async (
    workspaceSlug: string,
    projectId: string,
    templateId: string,
    payload: Partial<TWorkItemTemplate>
  ) => {
    const response = await this.workItemTemplateService.updateTemplate(workspaceSlug, projectId, templateId, payload);
    runInAction(() => {
      set(this.templates, response.id, response);
    });
    return response;
  };

  deleteTemplate = async (workspaceSlug: string, projectId: string, templateId: string) => {
    await this.workItemTemplateService.deleteTemplate(workspaceSlug, projectId, templateId);
    runInAction(() => {
      delete this.templates[templateId];
    });
  };

  useTemplate = async (workspaceSlug: string, projectId: string, templateId: string): Promise<TemplateUseResponse> => {
    const response = await this.workItemTemplateService.useTemplate(workspaceSlug, projectId, templateId);
    return response;
  };
}
