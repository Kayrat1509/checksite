from rest_framework import serializers
from .models import Issue, IssuePhoto, IssueComment
from apps.users.serializers import UserSerializer
from apps.projects.serializers import ProjectListSerializer, SiteListSerializer, CategorySerializer


class IssuePhotoSerializer(serializers.ModelSerializer):
    """Serializer for IssuePhoto model."""

    uploaded_by_details = UserSerializer(source='uploaded_by', read_only=True)

    class Meta:
        model = IssuePhoto
        fields = [
            'id', 'issue', 'stage', 'photo', 'caption',
            'uploaded_by', 'uploaded_by_details', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class IssueCommentSerializer(serializers.ModelSerializer):
    """Serializer for IssueComment model."""

    author_details = UserSerializer(source='author', read_only=True)

    class Meta:
        model = IssueComment
        fields = [
            'id', 'issue', 'author', 'author_details', 'text',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']


class IssueSerializer(serializers.ModelSerializer):
    """Serializer for Issue model."""

    created_by_details = UserSerializer(source='created_by', read_only=True)
    assigned_to_details = UserSerializer(source='assigned_to', read_only=True)
    verified_by_details = UserSerializer(source='verified_by', read_only=True)

    project_details = ProjectListSerializer(source='project', read_only=True)
    site_details = SiteListSerializer(source='site', read_only=True)
    category_details = CategorySerializer(source='category', read_only=True)

    photos = IssuePhotoSerializer(many=True, read_only=True)
    comments = IssueCommentSerializer(many=True, read_only=True)

    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Issue
        fields = [
            'id', 'title', 'description', 'project', 'project_details',
            'site', 'site_details', 'category', 'category_details',
            'status', 'priority', 'created_by', 'created_by_details',
            'assigned_to', 'assigned_to_details', 'verified_by', 'verified_by_details',
            'deadline', 'completed_at', 'correction_technology', 'materials_used',
            'location_notes', 'photos', 'comments', 'is_overdue',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class IssueListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing issues."""

    project_name = serializers.CharField(source='project.name', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    photo_count = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id', 'title', 'project_name', 'site_name', 'status', 'priority',
            'assigned_to_name', 'deadline', 'is_overdue', 'photo_count',
            'created_at'
        ]

    def get_photo_count(self, obj):
        """Get count of photos for this issue."""
        return obj.photos.count()


class IssueCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating issues."""

    class Meta:
        model = Issue
        fields = [
            'title', 'description', 'project', 'site', 'category',
            'priority', 'assigned_to', 'deadline', 'correction_technology',
            'location_notes'
        ]

    def create(self, validated_data):
        """Create issue with current user as creator."""
        validated_data['created_by'] = self.context['request'].user
        validated_data['status'] = Issue.Status.NEW
        return super().create(validated_data)


class IssueUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating issues."""

    class Meta:
        model = Issue
        fields = [
            'title', 'description', 'category', 'priority', 'assigned_to',
            'deadline', 'correction_technology', 'location_notes', 'materials_used'
        ]


class IssueStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating issue status."""

    status = serializers.ChoiceField(choices=Issue.Status.choices)
    comment = serializers.CharField(required=False, allow_blank=True)

    def validate_status(self, value):
        """Validate status transition."""
        issue = self.context.get('issue')
        user = self.context['request'].user

        # Define allowed transitions
        if value == Issue.Status.IN_PROGRESS:
            if not issue.assigned_to:
                raise serializers.ValidationError('Нельзя перевести в процесс без назначения исполнителя')

        elif value == Issue.Status.PENDING_REVIEW:
            if issue.status != Issue.Status.IN_PROGRESS:
                raise serializers.ValidationError('Можно отправить на проверку только из статуса "В процессе"')
            if user != issue.assigned_to and not user.is_management:
                raise serializers.ValidationError('Только назначенный исполнитель может отправить на проверку')

        elif value == Issue.Status.COMPLETED:
            if issue.status != Issue.Status.PENDING_REVIEW:
                raise serializers.ValidationError('Можно завершить только из статуса "На проверке"')
            if not user.can_verify_issues:
                raise serializers.ValidationError('У вас нет прав для завершения замечаний')

        elif value == Issue.Status.REJECTED:
            if not user.can_verify_issues:
                raise serializers.ValidationError('У вас нет прав для отклонения замечаний')

        return value
