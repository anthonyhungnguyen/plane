from django.db.models import Q, Exists, OuterRef

PROJECT_ADMIN_ROLE = 20


def issue_visibility_filter(user):
    """
    Return a Q object to filter issues a user can view, respecting the private flag.
    """
    from plane.db.models import (
        IssueAssignee,
        IssueMention,
        IssueSubscriber,
        ProjectMember,
    )
    if getattr(user, "is_anonymous", True):
        return Q(is_private=False)

    return (
        Q(is_private=False)
        | Q(created_by=user)
        | Q(
            Exists(
                IssueAssignee.objects.filter(
                    issue=OuterRef("pk"),
                    assignee=user,
                    deleted_at__isnull=True,
                )
            )
        )
        | Q(
            Exists(
                IssueMention.objects.filter(
                    issue=OuterRef("pk"),
                    mention=user,
                    deleted_at__isnull=True,
                )
            )
        )
        | Q(
            Exists(
                IssueSubscriber.objects.filter(
                    issue=OuterRef("pk"),
                    subscriber=user,
                    deleted_at__isnull=True,
                )
            )
        )
        | Q(
            Exists(
                ProjectMember.objects.filter(
                    project=OuterRef("project"),
                    member=user,
                    role=PROJECT_ADMIN_ROLE,
                    is_active=True,
                )
            )
        )
    )


def user_has_issue_access(user, issue):
    """
    Evaluate if the user can view the provided issue, considering privacy rules.
    """
    if not issue.is_private:
        return True

    if getattr(user, "is_anonymous", True):
        return False

    if issue.created_by_id == getattr(user, "id", None):
        return True

    from plane.db.models import (
        IssueAssignee,
        IssueMention,
        IssueSubscriber,
        ProjectMember,
    )

    if IssueAssignee.objects.filter(issue=issue, assignee=user, deleted_at__isnull=True).exists():
        return True

    if IssueMention.objects.filter(issue=issue, mention=user, deleted_at__isnull=True).exists():
        return True

    if IssueSubscriber.objects.filter(issue=issue, subscriber=user, deleted_at__isnull=True).exists():
        return True

    return ProjectMember.objects.filter(
        project=issue.project,
        member=user,
        role=PROJECT_ADMIN_ROLE,
        is_active=True,
    ).exists()
