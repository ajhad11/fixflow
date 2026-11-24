from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.businesses.views import BusinessViewSet, DashboardMetricsView

app_name = 'businesses'

router = DefaultRouter()
router.register(r'', BusinessViewSet, basename='business')

urlpatterns = [
    path('dashboard/', DashboardMetricsView.as_view(), name='dashboard_metrics'),
    path('', include(router.urls)),
]
