from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.repairs.views import RepairTicketViewSet, PublicTrackingView

app_name = 'repairs'

router = DefaultRouter()
router.register(r'', RepairTicketViewSet, basename='repair-ticket')

urlpatterns = [
    path('', include(router.urls)),
]
