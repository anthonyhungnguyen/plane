import { useContext } from "react";
import { StoreContext } from "@/lib/store-context";
import type { IWorkItemTemplateStore } from "@/store/project/work-item-template.store";

export const useWorkItemTemplate = (): IWorkItemTemplateStore => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useWorkItemTemplate must be used within StoreProvider");
  }
  return context.workItemTemplate;
};
