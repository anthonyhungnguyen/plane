# GHN fork: multi-cycle issue assignment.
# Replaces the body of CycleIssueViewSet.create so the fork's changes to that
# security-sensitive endpoint stay in one owned module. Any workspace/project
# scoping here is load-bearing (cross-tenant IDOR, GHSA-4w5x-wc9w-f47x) —
# keep it when reconciling with upstream.

import json

from django.core import serializers
from django.utils import timezone

from plane.bgtasks.issue_activities_task import issue_activity
from plane.db.models import Cycle, CycleIssue, Issue
from plane.utils.host import base_host


def assign_issues_to_cycle(request, slug, project_id, cycle_id, issues):
    """Assign issues to a cycle, allowing multi-cycle membership and
    reassignment from past cycles. Returns nothing; raises on bad cycle."""
    cycle = Cycle.objects.get(workspace__slug=slug, project_id=project_id, pk=cycle_id)

    cycle_issues = list(
        CycleIssue.objects.filter(
            issue_id__in=issues,
            workspace__slug=slug,
            project_id=project_id,
            deleted_at__isnull=True,
        ).order_by("created_at", "id")
    )
    primary_by_issue = {}
    for cycle_issue in cycle_issues:
        if cycle_issue.issue_id not in primary_by_issue:
            primary_by_issue[cycle_issue.issue_id] = cycle_issue

    existing_issues = set(str(issue_id) for issue_id in primary_by_issue.keys())
    new_issues = list(set(str(issue) for issue in issues) - existing_issues)

    # Scope to workspace+project to prevent cross-tenant IDOR
    new_issues = list(
        str(i)
        for i in Issue.issue_objects.filter(
            workspace__slug=slug,
            project_id=project_id,
            pk__in=new_issues,
        ).values_list("id", flat=True)
    )

    # New issues to create
    created_records = CycleIssue.objects.bulk_create(
        [
            CycleIssue(
                project_id=project_id,
                workspace_id=cycle.workspace_id,
                created_by_id=request.user.id,
                updated_by_id=request.user.id,
                cycle_id=cycle_id,
                issue_id=issue,
            )
            for issue in new_issues
        ],
        batch_size=10,
        ignore_conflicts=True,
    )

    updated_records = []
    update_cycle_issue_activity = []
    for issue_id, cycle_issue in primary_by_issue.items():
        if str(cycle_issue.cycle_id) == str(cycle_id):
            continue
        CycleIssue.objects.filter(issue_id=issue_id, cycle_id=cycle_id).exclude(pk=cycle_issue.pk).delete()
        old_cycle_id = cycle_issue.cycle_id
        cycle_issue.cycle_id = cycle_id
        cycle_issue.updated_by_id = request.user.id
        updated_records.append(cycle_issue)
        update_cycle_issue_activity.append(
            {
                "old_cycle_id": str(old_cycle_id),
                "new_cycle_id": str(cycle_id),
                "issue_id": str(issue_id),
            }
        )

    if updated_records:
        CycleIssue.objects.bulk_update(updated_records, ["cycle_id", "updated_by_id"], batch_size=100)

    # Capture Issue Activity
    issue_activity.delay(
        type="cycle.activity.created",
        requested_data=json.dumps({"cycles_list": issues}),
        actor_id=str(request.user.id),
        issue_id=None,
        project_id=str(project_id),
        current_instance=json.dumps(
            {
                "updated_cycle_issues": update_cycle_issue_activity,
                "created_cycle_issues": serializers.serialize("json", created_records),
            }
        ),
        epoch=int(timezone.now().timestamp()),
        notification=True,
        origin=base_host(request=request, is_app=True),
    )
