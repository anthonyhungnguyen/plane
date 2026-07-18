from plane.api.serializers import IssueSerializer
from plane.tests.factories import (
    IssueFactory,
    ProjectFactory,
    UserFactory,
    WorkspaceFactory,
    ProjectMemberFactory,
)
from plane.db.models import IssueAssignee

from rest_framework.test import APITestCase


class TestIssueAssigneeLimit(APITestCase):
    def setUp(self):
        self.workspace = WorkspaceFactory()
        self.project = ProjectFactory(workspace=self.workspace)
        self.user1 = UserFactory()
        self.user2 = UserFactory()
        self.project_member1 = ProjectMemberFactory(project=self.project, member=self.user1, role=20)
        self.project_member2 = ProjectMemberFactory(project=self.project, member=self.user2, role=20)

    def test_create_issue_with_multiple_assignees_fails(self):
        data = {
            "name": "Test Issue",
            "project": self.project.id,
            "assignees": [self.user1.id, self.user2.id],
        }
        context = {
            "project_id": self.project.id,
            "workspace_id": self.workspace.id,
            "default_assignee_id": None,
        }
        serializer = IssueSerializer(data=data, context=context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("assignees", serializer.errors) # Or check non_field_errors depending on implementation, but validation error raised in validate usually bubbles up.
        # Check specific error message if possible, but validation failure is key

    def test_create_issue_with_single_assignee_succeeds(self):
        data = {
            "name": "Test Issue",
            "project": self.project.id,
            "assignees": [self.user1.id],
        }
        context = {
            "project_id": self.project.id,
            "workspace_id": self.workspace.id,
            "default_assignee_id": None,
        }
        serializer = IssueSerializer(data=data, context=context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        issue = serializer.save()
        self.assertEqual(IssueAssignee.objects.filter(issue=issue).count(), 1)


    def test_update_issue_to_multiple_assignees_fails(self):
        issue = IssueFactory(project=self.project, workspace=self.workspace)
        data = {
            "assignees": [self.user1.id, self.user2.id],
        }
        context = {
            "project_id": self.project.id,
            "workspace_id": self.workspace.id,
            "default_assignee_id": None,
        }
        serializer = IssueSerializer(instance=issue, data=data, context=context, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn("assignees", serializer.errors) # Validation error should catch this

