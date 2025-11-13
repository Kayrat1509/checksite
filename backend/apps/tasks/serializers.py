# apps/tasks/serializers.py
"""
Сериализаторы для Task API.
"""

from rest_framework import serializers
from django.utils import timezone
from .models import Task
from apps.users.models import User
from apps.projects.models import Project


class TaskAssigneeSerializer(serializers.ModelSerializer):
    """Сериализатор для отображения информации об исполнителе."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'first_name', 'last_name', 'role']

    def get_full_name(self, obj):
        return obj.get_full_name()


class TaskCreatorSerializer(serializers.ModelSerializer):
    """Сериализатор для отображения информации о создателе."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'first_name', 'last_name', 'role']

    def get_full_name(self, obj):
        return obj.get_full_name()


class TaskListSerializer(serializers.ModelSerializer):
    """
    Сериализатор для списка задач (компактная версия).
    """

    created_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    assigned_to_user_name = serializers.SerializerMethodField()  # Имя сотрудника
    assigned_to_contractor_name = serializers.SerializerMethodField()  # Имя подрядчика
    assigned_to_email = serializers.SerializerMethodField()
    company_name = serializers.CharField(source='company.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'task_number',
            'title',
            'status',
            'status_display',
            'created_by',
            'created_by_name',
            'assigned_to_user',
            'assigned_to_contractor',
            'assigned_to_name',
            'assigned_to_user_name',
            'assigned_to_contractor_name',
            'assigned_to_email',
            'company_name',
            'project_name',
            'created_at',
            'deadline',
            'completed_at',
            'is_overdue',
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_assigned_to_name(self, obj):
        """
        Возвращает имена всех назначенных исполнителей через запятую.
        Поддерживает назначение сотрудника, подрядчика или обоих.
        """
        names = []
        if obj.assigned_to_user:
            names.append(obj.assigned_to_user.get_full_name())
        if obj.assigned_to_contractor:
            names.append(obj.assigned_to_contractor.get_full_name())
        return ', '.join(names) if names else None

    def get_assigned_to_user_name(self, obj):
        """Возвращает имя назначенного сотрудника."""
        return obj.assigned_to_user.get_full_name() if obj.assigned_to_user else None

    def get_assigned_to_contractor_name(self, obj):
        """Возвращает имя назначенного подрядчика."""
        return obj.assigned_to_contractor.get_full_name() if obj.assigned_to_contractor else None

    def get_assigned_to_email(self, obj):
        return obj.assigned_to_email


class TaskDetailSerializer(serializers.ModelSerializer):
    """
    Сериализатор для детальной информации о задаче.
    """

    created_by_data = TaskCreatorSerializer(source='created_by', read_only=True)
    assigned_to_user_data = TaskAssigneeSerializer(source='assigned_to_user', read_only=True)
    assigned_to_contractor_data = TaskAssigneeSerializer(source='assigned_to_contractor', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'task_number',
            'title',
            'description',
            'status',
            'status_display',
            'created_by',
            'created_by_data',
            'assigned_to_user',
            'assigned_to_user_data',
            'assigned_to_contractor',
            'assigned_to_contractor_data',
            'company',
            'company_name',
            'project',
            'project_name',
            'created_at',
            'updated_at',
            'deadline',
            'completed_at',
            'rejection_reason',
            'rejected_at',
            'is_overdue',
            'is_deleted',
        ]
        read_only_fields = ['task_number', 'created_by', 'created_at', 'updated_at']


class TaskCreateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания задачи.
    """

    class Meta:
        model = Task
        fields = [
            'title',
            'description',
            'assigned_to_user',
            'assigned_to_contractor',
            'deadline',
            'project',
        ]

    def validate(self, attrs):
        """
        Проверяем, что назначен хотя бы один исполнитель (сотрудник, подрядчик или оба).
        """
        assigned_to_user = attrs.get('assigned_to_user')
        assigned_to_contractor = attrs.get('assigned_to_contractor')

        # Должен быть назначен хотя бы один исполнитель
        if not assigned_to_user and not assigned_to_contractor:
            raise serializers.ValidationError(
                'Необходимо указать исполнителя: сотрудника, подрядчика или обоих'
            )

        # Проверяем, что дедлайн в будущем
        deadline = attrs.get('deadline')
        if deadline and deadline < timezone.now():
            raise serializers.ValidationError({
                'deadline': 'Срок исполнения не может быть в прошлом'
            })

        return attrs

    def create(self, validated_data):
        """
        Создаем задачу и отправляем email уведомление МОМЕНТАЛЬНО.
        """
        from .tasks import send_task_notification
        import logging

        logger = logging.getLogger(__name__)

        # Получаем текущего пользователя из контекста
        request = self.context.get('request')
        user = request.user if request else None

        # Устанавливаем создателя и компанию
        validated_data['created_by'] = user
        validated_data['company'] = user.company

        # Создаем задачу
        task = Task.objects.create(**validated_data)

        # Отправляем email уведомление исполнителю МОМЕНТАЛЬНО
        try:
            send_task_notification.delay(
                task_id=task.id,
                notification_type='created'
            )
            logger.info(f'Email уведомление о создании задачи {task.task_number} запланировано')
        except Exception as e:
            logger.error(f'Ошибка при планировании email для задачи {task.task_number}: {str(e)}')

        return task


class TaskUpdateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для обновления задачи.
    """

    class Meta:
        model = Task
        fields = [
            'title',
            'description',
            'assigned_to_user',
            'assigned_to_contractor',
            'deadline',
            'project',
            'status',
        ]

    def validate(self, attrs):
        """
        Проверяем, что назначен хотя бы один исполнитель (сотрудник, подрядчик или оба).
        """
        # Используем данные из instance, если поля не изменялись
        assigned_to_user = attrs.get('assigned_to_user', self.instance.assigned_to_user)
        assigned_to_contractor = attrs.get('assigned_to_contractor', self.instance.assigned_to_contractor)

        # Должен быть назначен хотя бы один исполнитель
        if not assigned_to_user and not assigned_to_contractor:
            raise serializers.ValidationError(
                'Необходимо указать исполнителя: сотрудника, подрядчика или обоих'
            )

        # Проверяем, что дедлайн в будущем (только для незавершенных задач)
        deadline = attrs.get('deadline')
        if deadline and self.instance.status not in [Task.STATUS_COMPLETED, Task.STATUS_REJECTED]:
            if deadline < timezone.now():
                raise serializers.ValidationError({
                    'deadline': 'Срок исполнения не может быть в прошлом'
                })

        return attrs

    def update(self, instance, validated_data):
        """
        Обновляем задачу и отправляем email уведомление МОМЕНТАЛЬНО.
        """
        from .tasks import send_task_notification
        import logging

        logger = logging.getLogger(__name__)

        # Сохраняем старые значения для проверки изменений
        old_deadline = instance.deadline
        old_assignee = instance.assigned_to

        # Обновляем задачу
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Проверяем, были ли значимые изменения
        significant_change = (
            old_deadline != instance.deadline or
            old_assignee != instance.assigned_to or
            'title' in validated_data or
            'description' in validated_data
        )

        # Отправляем email уведомление исполнителю МОМЕНТАЛЬНО (только при значимых изменениях)
        if significant_change:
            try:
                send_task_notification.delay(
                    task_id=instance.id,
                    notification_type='updated'
                )
                logger.info(f'Email уведомление об изменении задачи {instance.task_number} запланировано')
            except Exception as e:
                logger.error(f'Ошибка при планировании email для задачи {instance.task_number}: {str(e)}')

        return instance


class TaskRejectSerializer(serializers.Serializer):
    """
    Сериализатор для отмены задачи.
    """

    rejection_reason = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=1000,
        help_text='Обязательная причина отмены задачи'
    )

    def validate_rejection_reason(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Необходимо указать причину отмены задачи')
        return value.strip()


class TaskCompleteSerializer(serializers.Serializer):
    """
    Сериализатор для отметки задачи как выполненной.
    """

    pass  # Не требует дополнительных полей
