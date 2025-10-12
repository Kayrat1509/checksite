from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.utils import timezone
from django.db import models
from datetime import datetime, timedelta
from .utils import generate_pdf_report, generate_excel_report
from apps.projects.models import Project
from apps.issues.models import Issue


class ReportViewSet(viewsets.ViewSet):
    """ViewSet for generating reports."""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def project_summary(self, request):
        """Generate project summary report."""
        project_id = request.data.get('project_id')
        format_type = request.data.get('format', 'pdf')  # pdf or excel

        if not project_id:
            return Response(
                {'error': 'project_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Проект не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get issues for project
        issues = Issue.objects.filter(project=project).select_related(
            'site', 'category', 'created_by', 'assigned_to'
        ).prefetch_related('photos')

        data = {
            'project': project,
            'issues': issues,
            'total_issues': issues.count(),
            'completed': issues.filter(status=Issue.Status.COMPLETED).count(),
            'in_progress': issues.filter(status=Issue.Status.IN_PROGRESS).count(),
            'overdue': issues.filter(status=Issue.Status.OVERDUE).count(),
            'generated_at': timezone.now(),
        }

        if format_type == 'excel':
            file_content = generate_excel_report(data, 'project_summary')
            response = HttpResponse(
                file_content,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="project_{project.id}_report.xlsx"'
        else:
            file_content = generate_pdf_report(data, 'project_summary')
            response = HttpResponse(file_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="project_{project.id}_report.pdf"'

        return response

    @action(detail=False, methods=['post'])
    def contractor_performance(self, request):
        """Generate contractor performance report."""
        contractor_id = request.data.get('contractor_id')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        format_type = request.data.get('format', 'pdf')

        if not contractor_id:
            return Response(
                {'error': 'contractor_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            contractor = User.objects.get(id=contractor_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Подрядчик не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Filter issues
        issues = Issue.objects.filter(assigned_to=contractor)

        if start_date:
            issues = issues.filter(created_at__gte=start_date)
        if end_date:
            issues = issues.filter(created_at__lte=end_date)

        data = {
            'contractor': contractor,
            'issues': issues,
            'total_assigned': issues.count(),
            'completed': issues.filter(status=Issue.Status.COMPLETED).count(),
            'overdue': issues.filter(status=Issue.Status.OVERDUE).count(),
            'in_progress': issues.filter(status=Issue.Status.IN_PROGRESS).count(),
            'start_date': start_date,
            'end_date': end_date,
            'generated_at': timezone.now(),
        }

        if format_type == 'excel':
            file_content = generate_excel_report(data, 'contractor_performance')
            response = HttpResponse(
                file_content,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="contractor_{contractor.id}_report.xlsx"'
        else:
            file_content = generate_pdf_report(data, 'contractor_performance')
            response = HttpResponse(file_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="contractor_{contractor.id}_report.pdf"'

        return response

    @action(detail=False, methods=['post'])
    def overdue_issues(self, request):
        """Generate overdue issues report."""
        project_id = request.data.get('project_id')
        format_type = request.data.get('format', 'pdf')

        issues = Issue.objects.filter(status=Issue.Status.OVERDUE)

        if project_id:
            issues = issues.filter(project_id=project_id)

        issues = issues.select_related(
            'project', 'site', 'assigned_to'
        ).order_by('deadline')

        data = {
            'issues': issues,
            'total_overdue': issues.count(),
            'generated_at': timezone.now(),
        }

        if format_type == 'excel':
            file_content = generate_excel_report(data, 'overdue_issues')
            response = HttpResponse(
                file_content,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="overdue_issues_report.xlsx"'
        else:
            file_content = generate_pdf_report(data, 'overdue_issues')
            response = HttpResponse(file_content, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="overdue_issues_report.pdf"'

        return response

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics."""
        user = request.user

        # Base queryset
        if user.is_management or user.is_superuser:
            issues = Issue.objects.all()
        else:
            issues = Issue.objects.filter(
                models.Q(project__project_manager=user) |
                models.Q(project__team_members=user) |
                models.Q(assigned_to=user)
            ).distinct()

        # Calculate stats
        now = timezone.now()
        week_ago = now - timedelta(days=7)

        stats = {
            'total_issues': issues.count(),
            'new': issues.filter(status=Issue.Status.NEW).count(),
            'in_progress': issues.filter(status=Issue.Status.IN_PROGRESS).count(),
            'pending_review': issues.filter(status=Issue.Status.PENDING_REVIEW).count(),
            'completed': issues.filter(status=Issue.Status.COMPLETED).count(),
            'overdue': issues.filter(status=Issue.Status.OVERDUE).count(),
            'created_this_week': issues.filter(created_at__gte=week_ago).count(),
            'completed_this_week': issues.filter(
                status=Issue.Status.COMPLETED,
                completed_at__gte=week_ago
            ).count(),
        }

        return Response(stats)
