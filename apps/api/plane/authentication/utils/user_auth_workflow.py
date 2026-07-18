# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import os

from django.utils import timezone

from .workspace_project_join import process_workspace_project_invitations
from plane.db.models import Workspace, WorkspaceMember, WorkspaceMemberInvite
from plane.license.utils.instance_value import get_configuration_value


def post_user_auth_workflow(user, is_signup, request):
    # First, attach user to any accepted workspace/project invites.
    process_workspace_project_invitations(user=user)

    # Optionally auto-assign the user to a default workspace if configured.
    # This only runs when the user is not already a member of any workspace
    # after invite processing, to avoid unintended privilege additions.
    (DEFAULT_WORKSPACE_SLUG,) = get_configuration_value(
        [
            {
                "key": "DEFAULT_WORKSPACE_SLUG",
                "default": os.environ.get("DEFAULT_WORKSPACE_SLUG"),
            }
        ]
    )

    if not DEFAULT_WORKSPACE_SLUG:
        return

    # If the user is already in a workspace, skip.
    if WorkspaceMember.objects.filter(member=user, is_active=True).exists():
        return

    # Find the configured default workspace; if missing, skip.
    workspace = Workspace.objects.filter(slug=DEFAULT_WORKSPACE_SLUG).first()
    if not workspace:
        return

    # Create a "fake" accepted invite for the default workspace so the
    # standard invitation processing path on login can handle membership
    # creation and cache invalidation consistently.
    invite, created = WorkspaceMemberInvite.objects.get_or_create(
        workspace=workspace,
        email=user.email,
        defaults={
            "accepted": True,
            "token": "AUTO_JOIN",
            "role": 15,
            "responded_at": timezone.now(),
        },
    )
    if not created and not invite.accepted:
        invite.accepted = True
        invite.responded_at = invite.responded_at or timezone.now()
        invite.save(update_fields=["accepted", "responded_at"])

    # Process the just-created invite to add the user as a member and
    # clean up the invite using the existing utility.
    process_workspace_project_invitations(user=user)
