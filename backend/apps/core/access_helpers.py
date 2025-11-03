"""
Вспомогательные функции для проверки доступа через ButtonAccess.

Этот модуль предоставляет единую точку входа для всех проверок прав доступа
к кнопкам и действиям в системе.
"""
from django.core.cache import cache
from .models import ButtonAccess


def has_button_access(user, button_key, page=None):
    """
    Проверяет доступ пользователя к кнопке через ButtonAccess.

    Args:
        user: Пользователь (User instance)
        button_key: Ключ кнопки (например, 'create', 'edit', 'delete')
        page: Опционально - страница на которой находится кнопка

    Returns:
        bool: True если пользователь имеет доступ, False иначе

    Examples:
        >>> has_button_access(user, 'create', 'projects')
        True
        >>> has_button_access(user, 'delete', 'users')
        False
    """
    import logging
    logger = logging.getLogger(__name__)

    logger.info(f'[has_button_access] Called with user.role={user.role}, button_key={button_key}, page={page}')

    # SUPERADMIN имеет доступ ко всему
    if user.is_superuser or user.role == 'SUPERADMIN':
        logger.info('[has_button_access] User is superuser/SUPERADMIN - access granted')
        return True

    # Формируем ключ кэша
    cache_key = f'button_access:{user.role}:{button_key}:{page or "global"}'
    logger.info(f'[has_button_access] Cache key: {cache_key}')

    # Проверяем кэш
    cached_result = cache.get(cache_key)
    if cached_result is not None:
        logger.info(f'[has_button_access] Cache HIT - returning {cached_result}')
        return cached_result

    logger.info('[has_button_access] Cache MISS - querying database')

    # Ищем кнопку в БД
    try:
        button = ButtonAccess.objects.get(
            access_type='button',
            button_key=button_key,
            page=page,
            company__isnull=True  # Глобальные настройки
        )
        logger.info(f'[has_button_access] Found ButtonAccess: id={button.id}, default_access={button.default_access}')
        logger.info(f'[has_button_access] ButtonAccess.{user.role}={getattr(button, user.role, None)}')

        result = button.has_access(user.role)
        logger.info(f'[has_button_access] button.has_access({user.role}) returned: {result}')
    except ButtonAccess.DoesNotExist:
        # Если кнопка не найдена - запрещаем доступ
        logger.warning(f'[has_button_access] ButtonAccess NOT FOUND for button_key={button_key}, page={page}')
        result = False

    # Кэшируем результат на 10 секунд
    cache.set(cache_key, result, 10)
    logger.info(f'[has_button_access] Final result: {result} (cached)')

    return result


def has_page_access(user, page_name):
    """
    Проверяет доступ пользователя к странице через ButtonAccess.

    Args:
        user: Пользователь (User instance)
        page_name: Название страницы (например, 'projects', 'users')

    Returns:
        bool: True если пользователь имеет доступ, False иначе

    Examples:
        >>> has_page_access(user, 'projects')
        True
        >>> has_page_access(user, 'settings')
        False
    """
    # SUPERADMIN имеет доступ ко всему
    if user.is_superuser or user.role == 'SUPERADMIN':
        return True

    # Формируем ключ кэша
    cache_key = f'page_access:{user.role}:{page_name}'

    # Проверяем кэш
    cached_result = cache.get(cache_key)
    if cached_result is not None:
        return cached_result

    # Ищем страницу в БД
    try:
        page = ButtonAccess.objects.get(
            access_type='page',
            page=page_name,
            company__isnull=True  # Глобальные настройки
        )
        result = page.has_access(user.role)
    except ButtonAccess.DoesNotExist:
        # Если страница не найдена - запрещаем доступ
        result = False

    # Кэшируем результат на 10 секунд
    cache.set(cache_key, result, 10)

    return result


def check_multiple_button_access(user, button_keys, page=None):
    """
    Проверяет доступ пользователя к нескольким кнопкам одновременно.

    Args:
        user: Пользователь (User instance)
        button_keys: Список ключей кнопок
        page: Опционально - страница на которой находятся кнопки

    Returns:
        dict: Словарь {button_key: bool} с результатами проверки

    Examples:
        >>> check_multiple_button_access(user, ['create', 'edit', 'delete'], 'projects')
        {'create': True, 'edit': True, 'delete': False}
    """
    return {
        button_key: has_button_access(user, button_key, page)
        for button_key in button_keys
    }


def get_user_allowed_buttons(user, page=None):
    """
    Возвращает список всех кнопок доступных пользователю.

    Args:
        user: Пользователь (User instance)
        page: Опционально - фильтр по странице

    Returns:
        list: Список ключей кнопок доступных пользователю

    Examples:
        >>> get_user_allowed_buttons(user, 'projects')
        ['create', 'edit', 'export']
    """
    # SUPERADMIN имеет доступ ко всему
    if user.is_superuser or user.role == 'SUPERADMIN':
        # Возвращаем все кнопки
        queryset = ButtonAccess.objects.filter(access_type='button')
        if page:
            queryset = queryset.filter(page=page)
        return list(queryset.values_list('button_key', flat=True))

    # Формируем ключ кэша
    cache_key = f'user_buttons:{user.role}:{page or "all"}'

    # Проверяем кэш
    cached_result = cache.get(cache_key)
    if cached_result is not None:
        return cached_result

    # Ищем все кнопки в БД
    queryset = ButtonAccess.objects.filter(
        access_type='button',
        company__isnull=True
    )

    if page:
        queryset = queryset.filter(page=page)

    # Фильтруем по доступу
    allowed_buttons = [
        button.button_key
        for button in queryset
        if button.has_access(user.role)
    ]

    # Кэшируем результат на 10 секунд
    cache.set(cache_key, allowed_buttons, 10)

    return allowed_buttons


def get_user_allowed_pages(user):
    """
    Возвращает список всех страниц доступных пользователю.

    Args:
        user: Пользователь (User instance)

    Returns:
        list: Список названий страниц доступных пользователю

    Examples:
        >>> get_user_allowed_pages(user)
        ['dashboard', 'projects', 'issues', 'users']
    """
    # SUPERADMIN имеет доступ ко всему
    if user.is_superuser or user.role == 'SUPERADMIN':
        all_pages = ['dashboard', 'projects', 'issues', 'users', 'contractors',
                     'supervisions', 'material-requests', 'warehouse', 'tenders',
                     'reports', 'profile', 'settings']
        return all_pages

    # Формируем ключ кэша
    cache_key = f'user_pages:{user.role}'

    # Проверяем кэш
    cached_result = cache.get(cache_key)
    if cached_result is not None:
        return cached_result

    # Ищем все страницы в БД
    pages = ButtonAccess.objects.filter(
        access_type='page',
        company__isnull=True
    )

    # Фильтруем по доступу
    allowed_pages = [
        page.page
        for page in pages
        if page.has_access(user.role)
    ]

    # Кэшируем результат на 10 секунд
    cache.set(cache_key, allowed_pages, 10)

    return allowed_pages


def clear_access_cache(user=None, role=None):
    """
    Очищает кэш проверок доступа.

    Args:
        user: Опционально - пользователь для которого очистить кэш
        role: Опционально - роль для которой очистить кэш

    Если не указаны параметры - очищает весь кэш доступа.
    """
    if user:
        role = user.role

    if role:
        # Очищаем кэш для конкретной роли
        # Простое решение - очищаем весь кэш с префиксом
        cache.delete_pattern(f'button_access:{role}:*')
        cache.delete_pattern(f'page_access:{role}:*')
        cache.delete_pattern(f'user_buttons:{role}:*')
        cache.delete_pattern(f'user_pages:{role}')
    else:
        # Очищаем весь кэш доступа
        cache.delete_pattern('button_access:*')
        cache.delete_pattern('page_access:*')
        cache.delete_pattern('user_buttons:*')
        cache.delete_pattern('user_pages:*')
