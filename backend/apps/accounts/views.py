from rest_framework import status, generics, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.accounts.models import CustomUser, Role, UserProfile
from apps.accounts.serializers import (
    CustomTokenObtainPairSerializer,
    CustomUserSerializer,
    CreateStaffUserSerializer,
    ChangePasswordSerializer,
    UserProfileSerializer,
)
from apps.accounts.permissions import IsShopOwner, IsStaffUser
from apps.businesses.mixins import TenantQuerySetMixin

class CustomLoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)

class CurrentUserView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomUserSerializer

    def get_object(self):
        return self.request.user

class UpdateProfileView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({"old_password": ["Wrong current password."]}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StaffUserViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    serializer_class = CustomUserSerializer
    permission_classes = [IsShopOwner]
    filterset_fields = ['role__name', 'is_active']
    search_fields = ['first_name', 'last_name', 'email', 'phone']

    def get_queryset(self):
        return super().get_queryset().select_related('role', 'profile', 'business')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateStaffUserSerializer
        return CustomUserSerializer

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(business=user.business)
