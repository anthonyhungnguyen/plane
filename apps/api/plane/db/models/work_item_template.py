# Django imports
from django.db import models
from django.db.models import Q

# Module imports
from .project import ProjectBaseModel


class WorkItemTemplate(ProjectBaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    description_html = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} <{self.project.name}>"

    class Meta:
        verbose_name = "Work Item Template"
        verbose_name_plural = "Work Item Templates"
        db_table = "work_item_templates"
        ordering = ("name",)
        constraints = [
            models.UniqueConstraint(
                fields=["name", "project"],
                condition=Q(deleted_at__isnull=True),
                name="work_item_template_unique_name_project_when_deleted_at_null",
            )
        ]
