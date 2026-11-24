import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from apps.businesses.models import Business

class Role(models.Model):
    SUPER_ADMIN = 'SUPER_ADMIN'
    SHOP_OWNER = 'SHOP_OWNER'
    RECEPTIONIST = 'RECEPTIONIST'
    TECHNICIAN = 'TECHNICIAN'
    CUSTOMER = 'CUSTOMER'

    ROLE_CHOICES = [
        (SUPER_ADMIN, 'Super Administrator'),
        (SHOP_OWNER, 'Shop Owner'),
        (RECEPTIONIST, 'Receptionist'),
        (TECHNICIAN, 'Technician'),
        (CUSTOMER, 'Customer'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.get_name_display()

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address must be provided')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        super_role, _ = Role.objects.get_or_create(
            name=Role.SUPER_ADMIN,
            defaults={'description': 'Platform Super Administrator'}
        )
        extra_fields.setdefault('role', super_role)

        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    
    business = models.ForeignKey(Business, on_delete=models.CASCADE, null=True, blank=True, related_name='users')
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    
    is_active = models.BooleanField(default=True, db_index=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ['-created_at']

    @property
    def full_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.email

    @property
    def role_name(self):
        return self.role.name if self.role else None

    def __str__(self):
        return f"{self.email} ({self.role_name or 'No Role'})"

class UserProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    specialization = models.CharField(max_length=200, blank=True, help_text='e.g. Microsoldering, Screen Replacement')
    skills = models.TextField(blank=True)
    bio = models.TextField(blank=True)
    is_available = models.BooleanField(default=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Profile of {self.user.email}"
