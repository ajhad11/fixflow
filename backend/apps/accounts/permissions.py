from rest_framework import permissions
from apps.accounts.models import Role

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.is_superuser or 
            (request.user.role and request.user.role.name == Role.SUPER_ADMIN)
        ))

class IsShopOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        return bool(request.user.role and request.user.role.name in [Role.SUPER_ADMIN, Role.SHOP_OWNER])

class IsReceptionistOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        return bool(request.user.role and request.user.role.name in [
            Role.SUPER_ADMIN, Role.SHOP_OWNER, Role.RECEPTIONIST
        ])

class IsTechnician(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        return bool(request.user.role and request.user.role.name in [
            Role.SUPER_ADMIN, Role.SHOP_OWNER, Role.TECHNICIAN
        ])

class IsStaffUser(permissions.BasePermission):
    """Allows access to any internal repair shop staff member (Owner, Receptionist, Technician, SuperAdmin)."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        return bool(request.user.role and request.user.role.name in [
            Role.SUPER_ADMIN, Role.SHOP_OWNER, Role.RECEPTIONIST, Role.TECHNICIAN
        ])
