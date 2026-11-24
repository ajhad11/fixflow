from rest_framework.exceptions import PermissionDenied
from apps.accounts.models import Role

class TenantQuerySetMixin:
    """
    Ensures strict tenant-level isolation for all models with a `business` relationship.
    Superusers can query all data; shop staff are strictly scoped to their assigned business.
    """
    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if not user or not user.is_authenticated:
            return qs.none()

        if user.is_superuser or (user.role and user.role.name == Role.SUPER_ADMIN):
            # Super admin can optionally filter by business_id query param
            business_id = self.request.query_params.get('business_id')
            if business_id:
                return qs.filter(business_id=business_id)
            return qs

        if not user.business_id:
            return qs.none()

        return qs.filter(business_id=user.business_id)

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser or (user.role and user.role.name == Role.SUPER_ADMIN):
            # If super admin provided a business in validated_data or request body
            if 'business' not in serializer.validated_data and user.business:
                serializer.save(business=user.business)
            else:
                serializer.save()
            return

        if not user.business:
            raise PermissionDenied("You must belong to an active business to perform this action.")

        serializer.save(business=user.business)
