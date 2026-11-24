from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from apps.accounts.views import (
    CustomLoginView,
    LogoutView,
    CurrentUserView,
    UpdateProfileView,
    ChangePasswordView,
    StaffUserViewSet,
)

app_name = 'accounts'

router = DefaultRouter()
router.register(r'staff', StaffUserViewSet, basename='staff')

urlpatterns = [
    path('login/', CustomLoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('me/profile/', UpdateProfileView.as_view(), name='update_profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('', include(router.urls)),
]
