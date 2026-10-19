import type { PatternFixture } from "@/catalogue/types"

const DJANGO = "Django"

const djangoFixtureOf = (patternKey: string, matches: readonly string[], rejects: readonly string[]): PatternFixture => ({
  library: DJANGO,
  patternKey,
  matches,
  rejects,
})

const djangoImportedCall = (specifier: string, name: string, code: string): PatternFixture =>
  djangoFixtureOf(`call:${name}:*`, [`from ${specifier} import ${name}\n\n${code}`], [`def ${name}(*parts, **options):\n    return parts\n\n${code}`])

const djangoImportedDecorator = (specifier: string, name: string, decorator: string): PatternFixture =>
  djangoFixtureOf(
    `decorator:${name}:*`,
    [`from ${specifier} import ${name}\n\n@${decorator}\ndef my_view(request):\n    ...`],
    [`def ${name}(*parts):\n    return parts\n\n@${decorator}\ndef my_view(request):\n    ...`],
  )

const djangoCacheCall = (method: string, call: string): PatternFixture =>
  djangoFixtureOf(`call:cache.${method}:*`, [`from django.core.cache import cache\n\n${call}`], [`cache = {}\n\n${call}`])

export const djangoFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO,
    patternKey: "call:async_to_sync@asgiref.sync:*",
    matches: ["from asgiref.sync import async_to_sync\n\nasync def get_data(): ...\n\nsync_get_data = async_to_sync(get_data)"],
    rejects: ["def async_to_sync(function):\n    return function\n\nsync_get_data = async_to_sync(get_data)"],
  },
  {
    library: DJANGO,
    patternKey: "call:sync_to_async@asgiref.sync:*",
    matches: ["from asgiref.sync import sync_to_async\n\nasync def view(request):\n    results = await sync_to_async(sync_function, thread_sensitive=True)(pk=123)"],
    rejects: ["def sync_to_async(function):\n    return function\n\nasync def view(request):\n    results = await sync_to_async(sync_function)(pk=123)"],
  },
  djangoFixtureOf(
    "call:path:*",
    [
      "from django.urls import path\n\nurlpatterns = [\n    path(\"bio/<username>/\", views.bio, name=\"bio\"),\n]",
      "from django.urls import include, path\n\nurlpatterns = [\n    path(\"blog/\", include(\"blog.urls\")),\n]",
    ],
    ["from pathlib import Path as path\n\nurlpatterns = [path(\"bio/\")]"],
  ),
  djangoFixtureOf(
    "call:re_path:*",
    ["from django.urls import re_path\n\nurlpatterns = [\n    re_path(r\"^bio/(?P<username>\\w+)/$\", views.bio, name=\"bio\"),\n]"],
    ["def re_path(route, view):\n    return route\n\nurlpatterns = [re_path(r\"^bio/$\", views.bio)]"],
  ),
  djangoFixtureOf(
    "file:**/management/commands/[!_]*.py:*",
    ["polls/management/commands/closepoll.py", "apps/billing/management/commands/send_invoices.py"],
    ["polls/management/commands/__init__.py", "polls/management/commands/_private.py", "polls/commands/closepoll.py"],
  ),
  djangoImportedCall("django.shortcuts", "redirect", "def my_view(request):\n    return redirect(\"/some/url/\")"),
  djangoImportedCall("django.shortcuts", "render", "def my_view(request):\n    return render(request, \"myapp/index.html\", {\"foo\": \"bar\"})"),
  djangoImportedCall("django.template.response", "TemplateResponse", "def blog_index(request):\n    return TemplateResponse(request, \"entry_list.html\", {\"entries\": Entry.objects.all()})"),
  djangoImportedCall("django.shortcuts", "get_object_or_404", "def my_view(request):\n    obj = get_object_or_404(MyModel, pk=1)"),
  djangoImportedCall("django.shortcuts", "get_list_or_404", "def my_view(request):\n    my_objects = get_list_or_404(MyModel, published=True)"),
  djangoImportedCall("django.contrib.auth", "authenticate", "def my_view(request):\n    user = authenticate(request, username=username, password=password)"),
  djangoImportedCall("django.contrib.auth", "login", "def my_view(request):\n    login(request, user)"),
  djangoImportedCall("django.contrib.auth", "logout", "def logout_view(request):\n    logout(request)"),
  djangoImportedDecorator("django.contrib.auth.decorators", "login_required", "login_required"),
  djangoImportedDecorator("django.contrib.auth.decorators", "permission_required", "permission_required(\"polls.add_choice\")"),
  djangoImportedDecorator("django.contrib.auth.decorators", "user_passes_test", "user_passes_test(email_check)"),
  djangoImportedDecorator("django.views.decorators.cache", "cache_page", "cache_page(60 * 15)"),
  djangoImportedDecorator("django.views.decorators.http", "require_http_methods", "require_http_methods([\"GET\", \"POST\"])"),
  djangoImportedDecorator("django.views.decorators.http", "require_GET", "require_GET"),
  djangoImportedDecorator("django.views.decorators.http", "require_POST", "require_POST"),
  djangoImportedDecorator("django.views.decorators.http", "require_safe", "require_safe"),
  djangoCacheCall("get", "value = cache.get(\"my_key\")"),
  djangoCacheCall("set", "cache.set(\"my_key\", \"hello, world!\", 30)"),
  djangoCacheCall("get_or_set", "value = cache.get_or_set(\"my_new_key\", \"my new value\", 100)"),
  djangoCacheCall("delete", "cache.delete(\"a\")"),
  djangoFixtureOf(
    "decorator:transaction.atomic:*",
    ["from django.db import transaction\n\n@transaction.atomic\ndef viewfunc(request):\n    do_stuff()"],
    ["transaction = LocalLedger()\n\n@transaction.atomic\ndef viewfunc(request):\n    do_stuff()"],
  ),
  djangoFixtureOf(
    "call:transaction.atomic:*",
    ["from django.db import transaction\n\ndef viewfunc(request):\n    with transaction.atomic():\n        do_more_stuff()"],
    ["transaction = LocalLedger()\n\ndef viewfunc(request):\n    with transaction.atomic():\n        do_more_stuff()"],
  ),
  djangoImportedDecorator("django.dispatch", "receiver", "receiver(request_finished)"),
]
