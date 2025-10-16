from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db import models
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    RegisterSerializer, ChangePasswordSerializer, CompanySerializer
)
from .permissions import IsManagementOrSuperAdmin, CanManageProjects, CanManageUsers
from .models import Company

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Кастомный сериализатор для JWT токенов с поддержкой case-insensitive email."""

    def validate(self, attrs):
        """Приводим email к нижнему регистру перед аутентификацией."""
        # Приводим email (username field) к нижнему регистру
        if self.username_field in attrs:
            attrs[self.username_field] = attrs[self.username_field].lower()

        return super().validate(attrs)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Кастомная view для получения JWT токена с case-insensitive email."""
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(viewsets.GenericViewSet):
    """View for user registration (management only)."""

    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Register a new user."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response({
            'user': UserSerializer(user).data,
            'message': 'Регистрация успешна. Данные для входа отправлены на email.'
        }, status=status.HTTP_201_CREATED)


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing users."""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter users by company and check role-based access."""
        user = self.request.user

        # Запрещенные роли для доступа к списку пользователей
        FORBIDDEN_ROLES = ['CONTRACTOR', 'SUPERVISOR', 'OBSERVER', 'MASTER']

        # Superadmin sees all users
        if user.is_superuser:
            return User.objects.all()

        # Запрещаем доступ для определенных ролей (кроме действия 'me')
        if self.action != 'me' and user.role in FORBIDDEN_ROLES:
            return User.objects.none()

        # Пользователи без approved=True не имеют доступа (кроме 'me')
        if self.action != 'me' and not user.approved:
            return User.objects.none()

        # Users see all colleagues from their company
        if user.company:
            return User.objects.filter(company=user.company)

        # Users without company see no one (except themselves in 'me' action)
        return User.objects.filter(id=user.id)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        """
        Установка прав доступа.
        Управление пользователями (создание, редактирование, удаление, активация) доступно для:
        Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер ПТО.
        Просмотр списка пользователей доступен всем аутентифицированным пользователям.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'activate', 'deactivate']:
            return [CanManageUsers()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Set the company to current user's company if not provided."""
        if not serializer.validated_data.get('company') and self.request.user.company:
            serializer.save(company=self.request.user.company)
        else:
            serializer.save()

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """Update current user profile."""
        serializer = self.get_serializer(
            request.user,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change user password."""
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({
            'message': 'Пароль успешно изменен'
        })

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate user account."""
        user = self.get_object()
        user.is_active = True
        user.save()
        # Возвращаем полные данные пользователя для обновления UI
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate user account."""
        user = self.get_object()
        user.is_active = False
        user.save()
        # Возвращаем полные данные пользователя для обновления UI
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        """Get user's assigned projects."""
        user = self.get_object()
        from apps.projects.models import Project

        # Получаем проекты, где пользователь является участником или руководителем
        projects = Project.objects.filter(
            models.Q(team_members=user) | models.Q(project_manager=user)
        ).distinct()

        from apps.projects.serializers import ProjectListSerializer
        serializer = ProjectListSerializer(projects, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assign_projects(self, request, pk=None):
        """Assign projects to user."""
        user = self.get_object()
        project_ids = request.data.get('project_ids', [])

        from apps.projects.models import Project

        # Убираем пользователя из всех проектов
        Project.objects.filter(team_members=user).update()
        for project in Project.objects.filter(team_members=user):
            project.team_members.remove(user)

        # Добавляем в выбранные проекты
        if project_ids:
            projects = Project.objects.filter(id__in=project_ids, company=user.company)
            for project in projects:
                project.team_members.add(user)

        return Response({
            'message': f'Проекты обновлены для {user.get_full_name()}'
        })

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive contractor (soft delete)."""
        user = self.get_object()
        user.archived = True
        user.save()
        # Возвращаем полные данные пользователя для обновления UI
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """Unarchive contractor."""
        user = self.get_object()
        user.archived = False
        user.save()
        # Возвращаем полные данные пользователя для обновления UI
        serializer = self.get_serializer(user)
        return Response(serializer.data)


class CompanyViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing companies."""

    queryset = Company.objects.filter(is_active=True)
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter companies based on user permissions."""
        user = self.request.user

        # Superadmin видит все компании
        if user.is_superuser:
            return Company.objects.all()

        # Обычные пользователи видят только свою компанию
        if user.company:
            return Company.objects.filter(id=user.company.id)

        return Company.objects.none()
