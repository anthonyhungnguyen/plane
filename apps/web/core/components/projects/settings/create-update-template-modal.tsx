import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
// plane ui
import { ModalCore, Input, TextArea, Button, EModalWidth } from "@plane/ui";
// types
import type { TWorkItemTemplate } from "@plane/types";
// components
import { RichTextEditor } from "@/components/editor/rich-text/editor";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
// services
import { FileService } from "@/services/file.service";

const fileService = new FileService();

type Props = {
  isOpen: boolean;
  handleClose: () => void;
  data?: TWorkItemTemplate;
  onSubmit: (data: Partial<TWorkItemTemplate>) => Promise<void>;
  workspaceSlug: string;
  projectId: string;
};

const defaultValues: Partial<TWorkItemTemplate> = {
  name: "",
  description: "",
  description_html: "",
};

export const CreateUpdateTemplateModal = (props: Props) => {
  const { isOpen, handleClose, data, onSubmit, workspaceSlug, projectId } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { currentWorkspace } = useWorkspace();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Partial<TWorkItemTemplate>>({
    defaultValues,
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        description: data.description,
        description_html: data.description_html,
      });
    } else {
      reset(defaultValues);
    }
  }, [data, reset, isOpen]);

  const handleFormSubmit = async (formData: Partial<TWorkItemTemplate>) => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      handleClose();
      reset(defaultValues);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadFile = async (file: File): Promise<string> => {
    try {
      const response = await fileService.uploadWorkspaceAsset(
        workspaceSlug,
        {
          entity_id: projectId,
          entity_type: "ISSUE_DESCRIPTION",
        },
        file
      );
      return response.asset_id;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} width={EModalWidth.XXL}>
      <div className="p-5 space-y-4">
        <h3 className="text-18 font-medium text-custom-text-100">{data ? "Update Template" : "Create Template"}</h3>
        <form
          onSubmit={(e) => {
            void handleSubmit(handleFormSubmit)(e);
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label htmlFor="name" className="text-13 font-medium text-custom-text-200">
              Name
            </label>
            <Controller
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  id="name"
                  placeholder="Template Name"
                  className="w-full"
                  hasError={Boolean(errors.name)}
                />
              )}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
          </div>
          <div className="space-y-1">
            <label htmlFor="description" className="text-13 font-medium text-custom-text-200">
              Description
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  id="description"
                  placeholder="Short description"
                  className="w-full min-h-[80px] resize-y"
                  hasError={Boolean(errors.description)}
                />
              )}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="description_html" className="text-13 font-medium text-custom-text-200">
              Content
            </label>
            <div className="min-h-[200px] border border-custom-border-200 rounded-md p-2">
              <Controller
                name="description_html"
                control={control}
                render={({ field: { value } }) => (
                  <RichTextEditor
                    key={data?.id ?? "new"}
                    initialValue={value ?? ""}
                    workspaceSlug={workspaceSlug}
                    workspaceId={currentWorkspace?.id ?? ""}
                    projectId={projectId}
                    editable={true}
                    onChange={(_json, html) => {
                      setValue("description_html", html);
                    }}
                    uploadFile={handleUploadFile}
                    duplicateFile={(path) => Promise.resolve(path)} // Placeholder for duplicateFile
                    searchMentionCallback={() => Promise.resolve({})} // Placeholder for mentions
                  />
                )}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="neutral-primary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
              {data ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </ModalCore>
  );
};
