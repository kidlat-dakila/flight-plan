from django.urls import path

from pokedex import views

urlpatterns = [
    path("trainer/", views.trainer),
]
