from rest_framework import serializers
from .models import Project, Site, Category, Drawing
from apps.users.serializers import UserSerializer


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model."""

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'color', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SiteSerializer(serializers.ModelSerializer):
    """Serializer for Site model."""

    site_manager_details = UserSerializer(source='site_manager', read_only=True)

    class Meta:
        model = Site
        fields = [
            'id', 'project', 'name', 'description', 'latitude', 'longitude',
            'site_manager', 'site_manager_details', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SiteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing sites."""

    class Meta:
        model = Site
        fields = ['id', 'name', 'is_active']


class DrawingListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing drawings."""

    # Добавляем поле для размера файла (только для чтения)
    file_size = serializers.SerializerMethodField(read_only=True)

    uploaded_by_full_name = serializers.CharField(
        source='uploaded_by.get_full_name',
        read_only=True
    )
    uploaded_by_role = serializers.CharField(
        source='uploaded_by.role',
        read_only=True
    )

    def get_file_size(self, obj):
        """Возвращает размер файла в удобочитаемом формате."""
        if obj.file and hasattr(obj.file, 'size'):
            size_bytes = obj.file.size
            # Форматируем размер файла
            if size_bytes < 1024:
                return f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                size_kb = size_bytes / 1024
                return f"{size_kb:.2f} KB"
            elif size_bytes < 1024 * 1024 * 1024:
                size_mb = size_bytes / (1024 * 1024)
                return f"{size_mb:.2f} MB"
            else:
                size_gb = size_bytes / (1024 * 1024 * 1024)
                return f"{size_gb:.2f} GB"
        return None

    def to_representation(self, instance):
        """Переопределяем представление для возврата относительного URL файла."""
        representation = super().to_representation(instance)
        # Заменяем полный URL на относительный
        if instance.file:
            representation['file'] = instance.file.url
        else:
            representation['file'] = None
        return representation

    class Meta:
        model = Drawing
        fields = ['id', 'file', 'file_name', 'file_size', 'uploaded_by_full_name', 'uploaded_by_role', 'created_at']


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model."""

    project_manager_details = UserSerializer(source='project_manager', read_only=True)
    team_members_details = UserSerializer(source='team_members', many=True, read_only=True)
    sites = SiteListSerializer(many=True, read_only=True)
    drawings = DrawingListSerializer(many=True, read_only=True)

    # Statistics
    total_issues = serializers.IntegerField(read_only=True)
    completed_issues = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'address', 'customer', 'start_date', 'end_date',
            'description', 'project_manager', 'project_manager_details',
            'team_members', 'team_members_details', 'sites', 'drawings', 'is_active',
            'total_issues', 'completed_issues', 'progress_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing projects."""

    project_manager_name = serializers.CharField(
        source='project_manager.get_full_name',
        read_only=True
    )
    progress_percentage = serializers.FloatField(read_only=True)
    drawings = DrawingListSerializer(many=True, read_only=True)

    # Получаем список подрядчиков для проекта
    contractors = serializers.SerializerMethodField()

    def get_contractors(self, obj):
        """Возвращает список подрядчиков, назначенных на проект."""
        contractors = obj.team_members.filter(role='CONTRACTOR')
        return [
            {
                'id': contractor.id,
                'full_name': contractor.get_full_name(),
                'phone': contractor.phone,
                'email': contractor.email,
                'position': contractor.position,
            }
            for contractor in contractors
        ]

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'address', 'customer', 'project_manager', 'project_manager_name',
            'team_members', 'is_active', 'progress_percentage', 'drawings', 'contractors', 'created_at'
        ]


class DrawingSerializer(serializers.ModelSerializer):
    """Serializer for Drawing model."""

    # Добавляем поле для размера файла (только для чтения)
    file_size = serializers.SerializerMethodField(read_only=True)

    uploaded_by_details = UserSerializer(source='uploaded_by', read_only=True)
    uploaded_by_full_name = serializers.CharField(
        source='uploaded_by.get_full_name',
        read_only=True
    )
    uploaded_by_role = serializers.CharField(
        source='uploaded_by.role',
        read_only=True
    )

    def get_file_size(self, obj):
        """Возвращает размер файла в удобочитаемом формате."""
        if obj.file and hasattr(obj.file, 'size'):
            size_bytes = obj.file.size
            # Форматируем размер файла
            if size_bytes < 1024:
                return f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                size_kb = size_bytes / 1024
                return f"{size_kb:.2f} KB"
            elif size_bytes < 1024 * 1024 * 1024:
                size_mb = size_bytes / (1024 * 1024)
                return f"{size_mb:.2f} MB"
            else:
                size_gb = size_bytes / (1024 * 1024 * 1024)
                return f"{size_gb:.2f} GB"
        return None

    def to_representation(self, instance):
        """Переопределяем представление для возврата относительного URL файла."""
        representation = super().to_representation(instance)
        # Заменяем полный URL на относительный
        if instance.file:
            representation['file'] = instance.file.url
        else:
            representation['file'] = None
        return representation

    class Meta:
        model = Drawing
        fields = [
            'id', 'project', 'file', 'file_name', 'file_size', 'uploaded_by',
            'uploaded_by_details', 'uploaded_by_full_name', 'uploaded_by_role',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at', 'updated_at']
