from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login, name='login'),
    path('signup/', views.signup, name='signup'),
    path('admin/', views.admin_page, name='admin'),
    path('booking/', views.booking, name='booking'),
    path('history/', views.history, name='history'),
    path('order/', views.order, name='order'),
    path('profile/', views.profile, name='profile'),
]
