export type TWorkItemTemplate = {
  id: string;
  name: string;
  description: string;
  description_html: string;
  is_active: boolean;
  project: string;
  workspace: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
};
