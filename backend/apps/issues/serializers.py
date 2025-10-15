from rest_framework import serializers
from .models import Issue, IssuePhoto, IssueComment
from apps.users.serializers import UserSerializer
from apps.projects.serializers import ProjectListSerializer, SiteListSerializer, CategorySerializer


class IssuePhotoSerializer(serializers.ModelSerializer):
    """Serializer for IssuePhoto model."""

    uploaded_by_details = UserSerializer(source='uploaded_by', read_only=True)
    # Используем ImageField для загрузки, но возвращаем полный URL при чтении
    photo_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = IssuePhoto
        fields = [
            'id', 'issue', 'stage', 'photo', 'photo_url', 'caption',
            'uploaded_by', 'uploaded_by_details', 'created_at'
        ]
        read_only_fields = ['id', 'photo_url', 'created_at']

    def get_photo_url(self, obj):
        """Возвращает полный URL для фото."""
        if obj.photo and hasattr(obj.photo, 'url'):
            request = self.context.get('request')
            if request is not None:
                # Используем build_absolute_uri для построения полного URL
                try:
                    return request.build_absolute_uri(obj.photo.url)
                except Exception as e:
                    # Если не удалось построить, возвращаем относительный путь
                    print(f'Ошибка построения URL: {e}')
                    return obj.photo.url
            return obj.photo.url
        return None

    def to_representation(self, instance):
        """При чтении возвращаем photo_url как photo для обратной совместимости."""
        data = super().to_representation(instance)
        # Заменяем значение photo на полный URL
        data['photo'] = data.pop('photo_url', None)
        return data


class IssueCommentSerializer(serializers.ModelSerializer):
    """Serializer for IssueComment model."""

    author_details = UserSerializer(source='author', read_only=True)
    is_new = serializers.SerializerMethodField()

    class Meta:
        model = IssueComment
        fields = [
            'id', 'issue', 'author', 'author_details', 'text',
            'is_new', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'issue', 'author', 'created_at', 'updated_at']

    def get_is_new(self, obj):
        """Определяет, является ли комментарий новым для текущего пользователя."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Комментарий новый, если текущий пользователь не в списке прочитавших
            # и он не является автором комментария
            is_author = obj.author == request.user
            has_read = obj.read_by.filter(id=request.user.id).exists()
            return not is_author and not has_read
        return False


class IssueSerializer(serializers.ModelSerializer):
    """Serializer for Issue model."""

    created_by_details = UserSerializer(source='created_by', read_only=True)
    assigned_to_details = UserSerializer(source='assigned_to', read_only=True)
    verified_by_details = UserSerializer(source='verified_by', read_only=True)

    project_details = ProjectListSerializer(source='project', read_only=True)
    site_details = SiteListSerializer(source='site', read_only=True)
    category_details = CategorySerializer(source='category', read_only=True)

    photos = serializers.SerializerMethodField()
    comments = IssueCommentSerializer(many=True, read_only=True)

    is_overdue = serializers.BooleanField(read_only=True)

    def get_photos(self, obj):
        """Возвращает список фотографий с полными URL."""
        # Передаем контекст с request во вложенный сериализатор
        serializer = IssuePhotoSerializer(obj.photos.all(), many=True, context=self.context)
        return serializer.data

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
    comment_count = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()
    comments = IssueCommentSerializer(many=True, read_only=True)
    status = serializers.SerializerMethodField()

    def get_photos(self, obj):
        """Возвращает список фотографий с полными URL."""
        # Передаем контекст с request во вложенный сериализатор
        serializer = IssuePhotoSerializer(obj.photos.all(), many=True, context=self.context)
        return serializer.data

    def get_photo_count(self, obj):
        """Возвращает количество фотографий."""
        return obj.photos.count()

    def get_comment_count(self, obj):
        """Возвращает количество комментариев."""
        return obj.comments.count()

    def get_status(self, obj):
        """Возвращает автоматически вычисленный статус."""
        return obj.get_auto_status()

    class Meta:
        model = Issue
        fields = [
            'id', 'title', 'description', 'project_name', 'site_name', 'status', 'priority',
            'assigned_to_name', 'deadline', 'is_overdue', 'photo_count', 'comment_count',
            'photos', 'comments', 'created_at'
        ]


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
        user = self.context['request'].user
        validated_data['created_by'] = user

        # Создаем замечание
        issue = super().create(validated_data)

        # Устанавливаем автоматический статус
        issue.status = issue.get_auto_status()
        issue.save(update_fields=['status'])

        return issue


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
            # Разрешаем отправку на проверку из любого статуса (кроме завершенных)
            if issue.status in [Issue.Status.COMPLETED, Issue.Status.REJECTED]:
                raise serializers.ValidationError('Нельзя отправить на проверку завершенное или отклоненное замечание')
            # Доступно всем ролям согласно требованиям
            pass

        elif value == Issue.Status.COMPLETED:
            # Разрешаем установку статуса COMPLETED из любого статуса при нажатии кнопки "Принято"
            # Доступно: Главный инженер, Руководитель проекта, Начальник участка, Прораб, Технадзор, Авторский надзор
            allowed_roles = ['CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'FOREMAN', 'SUPERVISOR', 'OBSERVER']
            if not user.is_superuser and user.role not in allowed_roles:
                raise serializers.ValidationError('У вас нет прав для принятия замечаний')

        elif value == Issue.Status.REJECTED:
            allowed_roles = ['SITE_MANAGER', 'PROJECT_MANAGER', 'CHIEF_ENGINEER', 'DIRECTOR']
            if not user.is_superuser and user.role not in allowed_roles:
                raise serializers.ValidationError('У вас нет прав для отклонения замечаний')

        return value
