# GHN fork: shared queryset annotations for subscriber/mention/cycle ids.
# Keep these here (not inline in views) so upstream changes to the view
# querysets do not conflict with the fork.

from django.contrib.postgres.aggregates import ArrayAgg
from django.contrib.postgres.fields import ArrayField
from django.db.models import OuterRef, Q, Subquery, UUIDField, Value
from django.db.models.functions import Coalesce


def _coalesce_uuid_array(expression):
    return Coalesce(expression, Value([], output_field=ArrayField(UUIDField())))


def subscriber_ids_agg():
    """ArrayAgg-style annotation; for querysets that already group by issue."""
    return _coalesce_uuid_array(
        ArrayAgg(
            "issue_subscribers__subscriber_id",
            distinct=True,
            filter=Q(issue_subscribers__deleted_at__isnull=True),
        )
    )


def mention_ids_agg():
    return _coalesce_uuid_array(
        ArrayAgg(
            "issue_mention__mention_id",
            distinct=True,
            filter=Q(issue_mention__deleted_at__isnull=True),
        )
    )


def subscriber_ids_subquery():
    """Subquery-style annotation; safe on paginated/sliced querysets."""
    from plane.db.models import IssueSubscriber

    return _coalesce_uuid_array(
        Subquery(
            IssueSubscriber.objects.filter(issue_id=OuterRef("pk"), deleted_at__isnull=True)
            .values("issue_id")
            .annotate(arr=ArrayAgg("subscriber_id", distinct=True))
            .values("arr")
        )
    )


def mention_ids_subquery():
    from plane.db.models import IssueMention

    return _coalesce_uuid_array(
        Subquery(
            IssueMention.objects.filter(issue_id=OuterRef("pk"), deleted_at__isnull=True)
            .values("issue_id")
            .annotate(arr=ArrayAgg("mention_id", distinct=True))
            .values("arr")
        )
    )


def cycle_ids_subquery():
    from plane.db.models import CycleIssue

    return _coalesce_uuid_array(
        Subquery(
            CycleIssue.objects.filter(issue_id=OuterRef("pk"), deleted_at__isnull=True)
            .values("issue_id")
            .annotate(arr=ArrayAgg("cycle_id", distinct=True))
            .values("arr")
        )
    )
