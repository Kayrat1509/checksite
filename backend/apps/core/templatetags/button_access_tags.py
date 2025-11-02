"""
Custom template tags для матрицы доступа к кнопкам.
"""

from django import template

register = template.Library()


@register.filter
def get_role_access(button, role_key):
    """
    Получает значение доступа для конкретной роли.

    Usage:
        {{ button|get_role_access:"DIRECTOR" }}
    """
    return getattr(button, role_key, False)
