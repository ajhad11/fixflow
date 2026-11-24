from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.customers.views import DeviceViewSet, DeviceCategoryViewSet

router = DefaultRouter()
router.register(r'categories', DeviceCategoryViewSet, basename='devices-categories')
router.register(r'', DeviceViewSet, basename='devices-list')

urlpatterns = [
    path('', include(router.urls)),
]
