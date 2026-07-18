import { observer } from "mobx-react";
import { Bell } from "lucide-react";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// components
import { IssueActivityBlockComponent, IssueLink } from "./";

type TIssueSubscriptionActivity = { activityId: string; showIssue?: boolean; ends: "top" | "bottom" | undefined };

export const IssueSubscriptionActivity = observer(function IssueSubscriptionActivity(
  props: TIssueSubscriptionActivity
) {
  const { activityId, ends, showIssue = true } = props;
  const {
    activity: { getActivityById },
  } = useIssueDetail();

  const activity = getActivityById(activityId);
  if (!activity) return <></>;

  const isAdded = !!activity.new_identifier;
  const subscriberName = (isAdded ? activity.new_value : activity.old_value) || "subscriber";
  const subscriberId = activity.new_identifier ?? activity.old_identifier;

  return (
    <IssueActivityBlockComponent
      icon={<Bell className="h-3.5 w-3.5 flex-shrink-0 text-secondary" />}
      activityId={activityId}
      ends={ends}
    >
      <>
        {isAdded ? "added" : "removed"}{" "}
        {subscriberId ? (
          <a
            href={`/${activity.workspace_detail?.slug}/profile/${subscriberId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-medium text-primary hover:underline capitalize"
          >
            {subscriberName}
          </a>
        ) : (
          <span className="font-medium capitalize">{subscriberName}</span>
        )}{" "}
        {isAdded ? "as a subscriber" : "from subscribers"}
        {showIssue && (
          <>
            {" "}
            {isAdded ? "to " : " from "}
            <IssueLink activityId={activityId} />.
          </>
        )}
        {!showIssue && "."}
      </>
    </IssueActivityBlockComponent>
  );
});
