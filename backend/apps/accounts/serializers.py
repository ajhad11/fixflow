from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.accounts.models import CustomUser, Role, UserProfile
from apps.businesses.models import Business

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['id', 'avatar', 'specialization', 'skills', 'bio', 'is_available', 'commission_rate']

class BusinessBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ['id', 'name', 'slug', 'email', 'phone', 'is_active']

class CustomUserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    role_display = serializers.CharField(source='role.get_name_display', read_only=True)
    profile = UserProfileSerializer(read_only=True)
    business = BusinessBriefSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'phone',
            'role_name', 'role_display', 'business', 'profile', 'is_active', 'is_staff', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'role_name', 'role_display']

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        user = self.user
        if not user.is_active:
            raise serializers.ValidationError({"detail": "This account is inactive."})

        if user.business and not user.business.is_active:
            raise serializers.ValidationError({"detail": "The associated repair business is deactivated."})

        # Embed user payload directly in login response for client SPA
        data['user'] = {
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.full_name,
            'role': user.role.name if user.role else None,
            'role_display': user.role.get_name_display() if user.role else 'No Role',
            'is_staff': user.is_staff,
            'business': {
                'id': str(user.business.id) if user.business else None,
                'name': user.business.name if user.business else None,
                'slug': user.business.slug if user.business else None,
            } if user.business else None,
            'avatar': user.profile.avatar.url if hasattr(user, 'profile') and user.profile.avatar else None,
            'specialization': user.profile.specialization if hasattr(user, 'profile') else '',
        }
        return data

class CreateStaffUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    role_name = serializers.ChoiceField(
        choices=[Role.SHOP_OWNER, Role.RECEPTIONIST, Role.TECHNICIAN],
        write_only=True
    )

    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 'phone', 'role_name']

    def create(self, validated_data):
        password = validated_data.pop('password')
        role_name = validated_data.pop('role_name')
        
        role = Role.objects.get(name=role_name)
        user = CustomUser(role=role, is_staff=True, **validated_data)
        user.set_password(password)
        user.save()
        UserProfile.objects.create(user=user)
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
