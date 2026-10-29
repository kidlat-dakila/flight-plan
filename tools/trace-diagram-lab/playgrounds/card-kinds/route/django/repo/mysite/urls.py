from django.urls import include, path

from mysite import views
from pokedex import urls as pokedex_urls

urlpatterns = [
    path("health/", views.health),
    path("api/", include(pokedex_urls)),
]
