from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.customers.views import CustomerViewSet, DeviceViewSet, DeviceCategoryViewSet

app_name = 'customers'

router = DefaultRouter()
router.register(r'categories', DeviceCategoryViewSet, basename='device-category')
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'', CustomerViewSet, basename='customer')

urlpatterns = [
    path('', include(router.urls)),
]
