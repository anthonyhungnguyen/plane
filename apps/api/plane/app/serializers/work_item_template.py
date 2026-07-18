# Third party imports
from rest_framework import serializers

# Module imports
from plane.db.models import WorkItemTemplate
from .base import BaseSerializer


class WorkItemTemplateSerializer(BaseSerializer):
    class Meta:
        model = WorkItemTemplate
        fields = "__all__"
        read_only_fields = [
            "id",
            "workspace",
            "project",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        project = self.context.get("project")

        if project is None:
            raise serializers.ValidationError({"error": "Project context is required."})

        # Ensure project is enforced from context, not payload
        attrs["project"] = project
        attrs["workspace"] = project.workspace

        # Normalize description_html to string
        if attrs.get("description_html") is None:
            attrs["description_html"] = ""

        return attrs
