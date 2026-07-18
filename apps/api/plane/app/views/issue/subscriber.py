# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third Party imports
from rest_framework.response import Response
from rest_framework import status

# Module imports
from .. import BaseViewSet
from plane.app.serializers import IssueSubscriberSerializer, ProjectMemberLiteSerializer
from plane.app.permissions import ProjectEntityPermission, ProjectLitePermission
from plane.db.models import Issue, IssueActivity, IssueSubscriber, ProjectMember, User


class IssueSubscriberViewSet(BaseViewSet):
    serializer_class = IssueSubscriberSerializer
    model = IssueSubscriber

    permission_classes = [ProjectEntityPermission]

    def get_permissions(self):
        if self.action in ["subscribe", "unsubscribe", "subscription_status"]:
            self.permission_classes = [ProjectLitePermission]
        else:
            self.permission_classes = [ProjectEntityPermission]

        return super(IssueSubscriberViewSet, self).get_permissions()

    def perform_create(self, serializer):
        subscriber = serializer.save(
            project_id=self.kwargs.get("project_id"),
            issue_id=self.kwargs.get("issue_id"),
        )
        self.log_subscription_activity(
            issue_id=self.kwargs.get("issue_id"),
            project_id=self.kwargs.get("project_id"),
            subscriber_id=subscriber.subscriber_id,
            actor_id=self.request.user.id,
            verb="added",
        )

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(issue_id=self.kwargs.get("issue_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
                project__archived_at__isnull=True,
            )
            .order_by("-created_at")
            .distinct()
        )

    def list(self, request, slug, project_id, issue_id):
        members = ProjectMember.objects.filter(
            workspace__slug=slug, project_id=project_id, is_active=True
        ).select_related("member")
        serializer = ProjectMemberLiteSerializer(members, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, slug, project_id, issue_id, subscriber_id):
        issue_subscriber = IssueSubscriber.objects.get(
            project=project_id,
            subscriber=subscriber_id,
            workspace__slug=slug,
            issue=issue_id,
        )
        self.log_subscription_activity(
            issue_id=issue_id,
            project_id=project_id,
            subscriber_id=issue_subscriber.subscriber_id,
            actor_id=request.user.id,
            verb="removed",
        )
        issue_subscriber.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def subscribe(self, request, slug, project_id, issue_id):
        if IssueSubscriber.objects.filter(
            issue_id=issue_id,
            subscriber=request.user,
            workspace__slug=slug,
            project=project_id,
        ).exists():
            return Response(
                {"message": "User already subscribed to the issue."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subscriber = IssueSubscriber.objects.create(
            issue_id=issue_id, subscriber_id=request.user.id, project_id=project_id
        )
        serializer = IssueSubscriberSerializer(subscriber)
        self.log_subscription_activity(
            issue_id=issue_id,
            project_id=project_id,
            subscriber_id=request.user.id,
            actor_id=request.user.id,
            verb="added",
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def unsubscribe(self, request, slug, project_id, issue_id):
        issue_subscriber = IssueSubscriber.objects.get(
            project=project_id,
            subscriber=request.user,
            workspace__slug=slug,
            issue=issue_id,
        )
        self.log_subscription_activity(
            issue_id=issue_id,
            project_id=project_id,
            subscriber_id=request.user.id,
            actor_id=request.user.id,
            verb="removed",
        )
        issue_subscriber.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def subscription_status(self, request, slug, project_id, issue_id):
        issue_subscriber = IssueSubscriber.objects.filter(
            issue=issue_id,
            subscriber=request.user,
            workspace__slug=slug,
            project=project_id,
        ).exists()
        return Response({"subscribed": issue_subscriber}, status=status.HTTP_200_OK)

    def log_subscription_activity(self, issue_id, project_id, subscriber_id, actor_id, verb: str):
        try:
            issue = Issue.objects.get(pk=issue_id)
            subscriber = User.objects.get(pk=subscriber_id)
        except (Issue.DoesNotExist, User.DoesNotExist):
            return

        IssueActivity.objects.create(
            issue_id=issue_id,
            project_id=project_id,
            workspace_id=issue.workspace_id,
            actor_id=actor_id,
            verb="updated",
            field="subscription",
            comment="added a subscriber" if verb == "added" else "removed a subscriber",
            new_value=subscriber.display_name if verb == "added" else None,
            old_value=subscriber.display_name if verb != "added" else None,
            new_identifier=subscriber.id if verb == "added" else None,
            old_identifier=subscriber.id if verb != "added" else None,
        )
