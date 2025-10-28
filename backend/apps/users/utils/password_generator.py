"""
Утилита для генерации и хэширования постоянных паролей.

Используется при массовом импорте пользователей через Excel.
В отличие от временных паролей, постоянные пароли:
- Не требуют обязательной смены при первом входе
- Не имеют срока действия
- Отправляются один раз на email
"""

import secrets
import string
from django.contrib.auth.hashers import make_password
import logging

logger = logging.getLogger(__name__)


def generate_permanent_password(length=12):
    """
    Генерация надежного постоянного пароля.

    Требования безопасности:
    - Длина: 12 символов (по умолчанию)
    - Содержит: заглавные буквы (A-Z)
    - Содержит: строчные буквы (a-z)
    - Содержит: цифры (0-9)
    - Содержит: спецсимволы (!@#$%^&*)

    Args:
        length (int): Длина пароля (минимум 8, рекомендуется 12)

    Returns:
        str: Сгенерированный пароль, например: "Kx9!mP2@wQz5"

    Raises:
        ValueError: Если length < 8
    """
    if length < 8:
        raise ValueError('Длина пароля должна быть не менее 8 символов')

    # Определяем алфавит для генерации
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"

    # Генерируем пароль до тех пор, пока не выполнятся все требования
    max_attempts = 100  # Защита от бесконечного цикла
    for attempt in range(max_attempts):
        password = ''.join(secrets.choice(alphabet) for _ in range(length))

        # Проверка требований безопасности
        has_lower = any(c.islower() for c in password)
        has_upper = any(c.isupper() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*" for c in password)

        if has_lower and has_upper and has_digit and has_special:
            logger.debug(f'Пароль успешно сгенерирован за {attempt + 1} попыток')
            return password

    # Если не удалось сгенерировать за max_attempts, логируем предупреждение
    logger.warning(f'Не удалось сгенерировать пароль с требованиями за {max_attempts} попыток')
    raise RuntimeError('Ошибка генерации пароля с требованиями безопасности')


def hash_password(plain_password):
    """
    Хэширование пароля с использованием Django hasher.

    Использует настройки PASSWORD_HASHERS из settings.py.
    По умолчанию Django использует PBKDF2 с SHA256.

    Args:
        plain_password (str): Пароль в открытом виде

    Returns:
        str: Хэшированный пароль в формате Django (algorithm$iterations$salt$hash)

    Example:
        >>> hash_password('MyPassword123!')
        'pbkdf2_sha256$260000$...'
    """
    hashed = make_password(plain_password)
    logger.debug(f'Пароль успешно хэширован (алгоритм: {hashed.split("$")[0]})')
    return hashed


def generate_and_hash_password(length=12):
    """
    Комбинированная функция: генерация + хэширование.

    Удобная обертка для одновременной генерации и хэширования пароля.

    Args:
        length (int): Длина пароля

    Returns:
        tuple: (plain_password, hashed_password)
            - plain_password (str): Пароль в открытом виде (для отправки на email)
            - hashed_password (str): Хэшированный пароль (для сохранения в БД)

    Example:
        >>> plain, hashed = generate_and_hash_password()
        >>> print(f'Пароль: {plain}')  # Kx9!mP2@wQz5
        >>> print(f'Хэш: {hashed[:30]}...')  # pbkdf2_sha256$260000$...
    """
    plain_password = generate_permanent_password(length)
    hashed_password = hash_password(plain_password)

    logger.info('Пароль сгенерирован и хэширован успешно')
    return plain_password, hashed_password
