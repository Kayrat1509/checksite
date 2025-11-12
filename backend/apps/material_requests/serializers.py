# apps/material_requests/serializers.py
"""
Сериализаторы для API заявок на материалы.
"""

from rest_framework import serializers
from django.utils import timezone
from .models import MaterialRequest, MaterialRequestItem, ApprovalStep, MaterialRequestHistory
from apps.users.models import User
from apps.projects.models import Project


class UserBriefSerializer(serializers.ModelSerializer):
    """Краткая информация о пользователе."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'first_name', 'last_name', 'role']

    def get_full_name(self, obj):
        return obj.get_full_name()


class MaterialRequestItemSerializer(serializers.ModelSerializer):
    """Сериализатор для позиций заявки на материалы."""

    # Переопределяем поля, чтобы сделать их необязательными
    position_number = serializers.IntegerField(required=False, allow_null=True)
    tender = serializers.PrimaryKeyRelatedField(required=False, allow_null=True, read_only=True)

    class Meta:
        model = MaterialRequestItem
        fields = [
            'id',
            'position_number',
            'material_name',
            'unit',
            'quantity_requested',
            'quantity_actual',
            'notes',
            'tender',
        ]
        read_only_fields = ['id']

    def validate_quantity_requested(self, value):
        """Проверка, что количество положительное."""
        if value <= 0:
            raise serializers.ValidationError('Количество должно быть больше нуля')
        return value

    def validate_quantity_actual(self, value):
        """Проверка фактического количества."""
        if value is not None and value < 0:
            raise serializers.ValidationError('Фактическое количество не может быть отрицательным')
        return value


class ApprovalStepSerializer(serializers.ModelSerializer):
    """Сериализатор для этапов согласования."""

    approved_by_data = UserBriefSerializer(source='approved_by', read_only=True)
    role_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ApprovalStep
        fields = [
            'id',
            'role',
            'role_display',
            'status',
            'status_display',
            'approved_by',
            'approved_by_data',
            'created_at',
            'approved_at',
            'comment',
        ]
        read_only_fields = ['id', 'created_at']

    def get_role_display(self, obj):
        """Возвращает читаемое название роли."""
        role_names = {
            'MASTER': 'Мастер',
            'FOREMAN': 'Прораб',
            'SITE_MANAGER': 'Начальник участка',
            'ENGINEER': 'Инженер ПТО',
            'PROJECT_MANAGER': 'Руководитель проекта',
            'CHIEF_ENGINEER': 'Главный инженер',
            'DIRECTOR': 'Директор',
            'SUPPLY_MANAGER': 'Снабженец',
            'WAREHOUSE_HEAD': 'Зав.Центрсклада',
        }
        return role_names.get(obj.role, obj.role)


class MaterialRequestHistorySerializer(serializers.ModelSerializer):
    """Сериализатор для истории заявки."""

    user_data = UserBriefSerializer(source='user', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = MaterialRequestHistory
        fields = [
            'id',
            'action',
            'action_display',
            'user',
            'user_data',
            'created_at',
            'details',
            'comment',
        ]
        read_only_fields = ['id', 'created_at']


class MaterialRequestListSerializer(serializers.ModelSerializer):
    """
    Сериализатор для списка заявок (компактная версия).
    Используется для отображения в таблицах и списках.
    """

    author_name = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_approval_role_display = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    total_items_requested = serializers.SerializerMethodField()
    # Добавляем позиции заявки для отображения в таблице
    items = MaterialRequestItemSerializer(many=True, read_only=True)

    class Meta:
        model = MaterialRequest
        fields = [
            'id',
            'request_number',
            'title',
            'description',
            'status',
            'status_display',
            'current_approval_role',
            'current_approval_role_display',
            'author',
            'author_name',
            'project',
            'project_name',
            'company_name',
            'items',  # Добавили поле items
            'items_count',
            'total_items_requested',
            'created_at',
            'updated_at',
            'submitted_at',
            'approved_at',
            'completed_at',
        ]

    def get_author_name(self, obj):
        return obj.author.get_full_name() if obj.author else None

    def get_current_approval_role_display(self, obj):
        """Возвращает читаемое название текущей роли на согласовании."""
        if not obj.current_approval_role:
            return None

        role_names = {
            'MASTER': 'Мастер',
            'FOREMAN': 'Прораб',
            'SITE_MANAGER': 'Начальник участка',
            'ENGINEER': 'Инженер ПТО',
            'PROJECT_MANAGER': 'Руководитель проекта',
            'CHIEF_ENGINEER': 'Главный инженер',
            'DIRECTOR': 'Директор',
            'SUPPLY_MANAGER': 'Снабженец',
        }
        return role_names.get(obj.current_approval_role, obj.current_approval_role)

    def get_items_count(self, obj):
        """Возвращает количество позиций в заявке."""
        return obj.items.count()

    def get_total_items_requested(self, obj):
        """Возвращает общее количество запрошенных материалов."""
        from django.db.models import Sum
        total = obj.items.aggregate(total=Sum('quantity_requested'))['total']
        return float(total) if total else 0


class MaterialRequestDetailSerializer(serializers.ModelSerializer):
    """
    Детальный сериализатор заявки на материалы.
    Включает всю информацию: позиции, этапы согласования, историю.
    """

    author_data = UserBriefSerializer(source='author', read_only=True)
    project_data = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_approval_role_display = serializers.SerializerMethodField()
    items = MaterialRequestItemSerializer(many=True, read_only=False)
    approval_steps = ApprovalStepSerializer(many=True, read_only=True)
    history = MaterialRequestHistorySerializer(many=True, read_only=True)
    rejected_by_data = UserBriefSerializer(source='rejected_by', read_only=True)

    class Meta:
        model = MaterialRequest
        fields = [
            'id',
            'request_number',
            'title',
            'description',
            'status',
            'status_display',
            'current_approval_role',
            'current_approval_role_display',
            'author',
            'author_data',
            'project',
            'project_data',
            'company',
            'items',
            'approval_steps',
            'history',
            'created_at',
            'updated_at',
            'submitted_at',
            'approved_at',
            'completed_at',
            'rejection_reason',
            'rejected_by',
            'rejected_by_data',
            'rejected_at',
        ]
        read_only_fields = [
            'id',
            'request_number',
            'status',
            'current_approval_role',
            'created_at',
            'updated_at',
            'submitted_at',
            'approved_at',
            'completed_at',
            'rejected_by',
            'rejected_at',
        ]

    def get_current_approval_role_display(self, obj):
        """Возвращает читаемое название текущей роли на согласовании."""
        if not obj.current_approval_role:
            return None

        role_names = {
            'MASTER': 'Мастер',
            'FOREMAN': 'Прораб',
            'SITE_MANAGER': 'Начальник участка',
            'ENGINEER': 'Инженер ПТО',
            'PROJECT_MANAGER': 'Руководитель проекта',
            'CHIEF_ENGINEER': 'Главный инженер',
            'DIRECTOR': 'Директор',
            'SUPPLY_MANAGER': 'Снабженец',
        }
        return role_names.get(obj.current_approval_role, obj.current_approval_role)

    def get_project_data(self, obj):
        """Возвращает краткую информацию о проекте."""
        if obj.project:
            return {
                'id': obj.project.id,
                'name': obj.project.name,
                'address': obj.project.address,
            }
        return None

    def create(self, validated_data):
        """Создание заявки с позициями."""
        items_data = validated_data.pop('items', [])
        request = self.context.get('request')
        user = request.user if request else None

        # Удаляем author и company из validated_data, если они там есть
        validated_data.pop('author', None)
        validated_data.pop('company', None)

        # Создаем заявку
        material_request = MaterialRequest.objects.create(
            **validated_data,
            author=user,
            company=user.company if user else None
        )

        # Создаем позиции заявки с автоматической нумерацией
        for index, item_data in enumerate(items_data, start=1):
            # Если position_number не указан, автоматически проставляем
            if 'position_number' not in item_data or item_data['position_number'] is None:
                item_data['position_number'] = index
            MaterialRequestItem.objects.create(
                material_request=material_request,
                **item_data
            )

        # Записываем в историю
        MaterialRequestHistory.objects.create(
            material_request=material_request,
            action=MaterialRequestHistory.ACTION_CREATED,
            user=user,
            comment='Заявка создана'
        )

        return material_request

    def update(self, instance, validated_data):
        """Обновление заявки с позициями."""
        items_data = validated_data.pop('items', None)
        request = self.context.get('request')
        user = request.user if request else None

        # Обновляем основные поля заявки
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Обновляем позиции заявки, если они переданы
        if items_data is not None:
            # Удаляем старые позиции
            instance.items.all().delete()

            # Создаем новые позиции
            for item_data in items_data:
                MaterialRequestItem.objects.create(
                    material_request=instance,
                    **item_data
                )

        return instance


class MaterialRequestCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания новой заявки."""

    items = MaterialRequestItemSerializer(many=True, required=True)

    class Meta:
        model = MaterialRequest
        fields = [
            'title',
            'description',
            'project',
            'items',
        ]

    def validate_items(self, value):
        """Проверка, что есть хотя бы одна позиция."""
        if not value:
            raise serializers.ValidationError('Заявка должна содержать хотя бы одну позицию')
        return value

    def validate_project(self, value):
        """
        Проверка, что пользователь имеет доступ к проекту.

        Пользователь должен быть:
        - В team_members проекта, ИЛИ
        - Руководителем проекта (project_manager), ИЛИ
        - Иметь руководящую роль (Директор, Главный инженер и т.д.)
        """
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('Не удалось определить пользователя')

        user = request.user
        project = value

        # Проверяем, что проект принадлежит компании пользователя
        if project.company != user.company:
            raise serializers.ValidationError('Проект не принадлежит вашей компании')

        # Руководящие роли имеют доступ ко всем проектам компании
        management_roles = [
            'SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER',
            'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER'
        ]

        if user.role in management_roles:
            return value

        # Проверяем, что пользователь закреплен за проектом
        is_team_member = project.team_members.filter(id=user.id).exists()
        is_project_manager = project.project_manager == user

        if not (is_team_member or is_project_manager):
            raise serializers.ValidationError(
                'Вы не закреплены за этим проектом. Обратитесь к руководителю проекта.'
            )

        return value

    def create(self, validated_data):
        """Создание заявки с позициями."""
        items_data = validated_data.pop('items')
        request = self.context.get('request')
        user = request.user if request else None

        # Проверяем, что пользователь может создавать заявки
        allowed_roles = ['MASTER', 'FOREMAN', 'SITE_MANAGER']
        if user and user.role not in allowed_roles:
            raise serializers.ValidationError(
                'Только Мастер, Прораб или Начальник участка могут создавать заявки'
            )

        # Создаем заявку
        material_request = MaterialRequest.objects.create(
            **validated_data,
            author=user,
            company=user.company,
            status=MaterialRequest.STATUS_DRAFT
        )

        # Создаем позиции заявки
        for idx, item_data in enumerate(items_data, start=1):
            MaterialRequestItem.objects.create(
                material_request=material_request,
                position_number=idx,
                **item_data
            )

        # Записываем в историю
        MaterialRequestHistory.objects.create(
            material_request=material_request,
            action=MaterialRequestHistory.ACTION_CREATED,
            user=user,
            comment='Заявка создана'
        )

        return material_request


class MaterialRequestSubmitSerializer(serializers.Serializer):
    """Сериализатор для отправки заявки на согласование."""
    pass  # Не требует полей, только действие


class MaterialRequestApproveSerializer(serializers.Serializer):
    """Сериализатор для согласования заявки."""

    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='Комментарий при согласовании'
    )


class MaterialRequestRejectSerializer(serializers.Serializer):
    """Сериализатор для возврата заявки на доработку."""

    reason = serializers.CharField(
        required=True,
        help_text='Причина возврата на доработку'
    )

    def validate_reason(self, value):
        """Проверка, что причина указана."""
        if not value or not value.strip():
            raise serializers.ValidationError('Необходимо указать причину возврата')
        return value


class MaterialRequestActualQuantitySerializer(serializers.Serializer):
    """Сериализатор для обновления фактического количества материалов."""

    item_id = serializers.IntegerField(required=True, help_text='ID позиции заявки')
    quantity_actual = serializers.DecimalField(
        required=True,
        max_digits=10,
        decimal_places=2,
        help_text='Фактическое количество'
    )

    def validate_quantity_actual(self, value):
        """Проверка фактического количества."""
        if value < 0:
            raise serializers.ValidationError('Фактическое количество не может быть отрицательным')
        return value
