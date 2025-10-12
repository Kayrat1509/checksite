"""
Custom middleware for Check_Site project.
"""
from django.utils.deprecation import MiddlewareMixin


class DisableCSRFForAPIMiddleware(MiddlewareMixin):
    """
    Disable CSRF validation for API endpoints.

    Since we use JWT authentication for API endpoints,
    we don't need CSRF protection for them.
    """

    def process_request(self, request):
        """Disable CSRF check for API endpoints."""
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None
