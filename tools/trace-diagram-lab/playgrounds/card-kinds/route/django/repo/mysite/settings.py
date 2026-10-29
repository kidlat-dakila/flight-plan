import os

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "pallet-town")
DEBUG = False
ALLOWED_HOSTS = ["localhost"]
ROOT_URLCONF = "mysite.urls"

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "pokedex",
]

MIDDLEWARE = [
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": "pokedex.sqlite3"}}
