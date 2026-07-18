# Django imports
from django.shortcuts import get_object_or_404

# Third party imports
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

# Module imports
from plane.app.serializers import WorkItemTemplateSerializer
from plane.app.views.base import BaseViewSet
from plane.db.models import Project, ProjectMember, WorkItemTemplate


class WorkItemTemplateEndpoint(BaseViewSet):
    serializer_class = WorkItemTemplateSerializer
    model = WorkItemTemplate
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]

    def get_project(self):
        slug = self.kwargs.get("slug")
        project_id = self.kwargs.get("project_id")
        return get_object_or_404(Project, pk=project_id, workspace__slug=slug)

    def _can_manage(self, project):
        return ProjectMember.objects.filter(
            project=project,
            member=self.request.user,
            is_active=True,
            role__gte=15,
        ).exists()

    def _ensure_member(self, project):
        if not ProjectMember.objects.filter(project=project, member=self.request.user, is_active=True).exists():
            raise PermissionDenied("You don't have the required permissions.")

    def get_queryset(self):
        project = self.get_project()
        self._ensure_member(project)
        return WorkItemTemplate.objects.filter(project=project)

    def create(self, request, *args, **kwargs):
        project = self.get_project()
        self._ensure_member(project)
        if not self._can_manage(project):
            raise PermissionDenied("Only project admins and members can create templates.")

        serializer = self.get_serializer(data=request.data, context={"request": request, "project": project})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        project = self.get_project()
        self._ensure_member(project)
        if not self._can_manage(project):
            raise PermissionDenied("Only project admins and members can update templates.")

        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=True, context={"request": request, "project": project}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        project = self.get_project()
        self._ensure_member(project)
        if not self._can_manage(project):
            raise PermissionDenied("Only project admins and members can delete templates.")

        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def use(self, request, *args, **kwargs):
        project = self.get_project()
        self._ensure_member(project)

        template = self.get_object()
        serializer = self.get_serializer(template)
        return Response(
            {
                "template": serializer.data,
                "description_html": template.description_html,
                "name": template.name,
            },
            status=status.HTTP_200_OK,
        )
