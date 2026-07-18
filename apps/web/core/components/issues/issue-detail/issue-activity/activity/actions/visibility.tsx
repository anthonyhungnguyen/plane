import { observer } from "mobx-react";
import { Lock } from "lucide-react";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// components
import { IssueActivityBlockComponent, IssueLink } from "./";

type TIssueVisibilityActivity = { activityId: string; showIssue?: boolean; ends: "top" | "bottom" | undefined };

export const IssueVisibilityActivity = observer(function IssueVisibilityActivity(props: TIssueVisibilityActivity) {
  const { activityId, ends, showIssue = true } = props;
  const {
    activity: { getActivityById },
  } = useIssueDetail();

  const activity = getActivityById(activityId);
  if (!activity) return <></>;

  const isPrivate = String(activity.new_value).toLowerCase() === "true";

  return (
    <IssueActivityBlockComponent
      icon={<Lock className="h-3.5 w-3.5 flex-shrink-0 text-secondary" />}
      activityId={activityId}
      ends={ends}
    >
      <>
        {isPrivate ? "made the work item private" : "made the work item visible to project members"}
        {showIssue && (
          <>
            {" "}
            for <IssueLink activityId={activityId} />.
          </>
        )}
        {!showIssue && "."}
      </>
    </IssueActivityBlockComponent>
  );
});
