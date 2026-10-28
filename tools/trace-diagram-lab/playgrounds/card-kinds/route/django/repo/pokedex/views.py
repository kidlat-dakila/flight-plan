from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_GET


@login_required
@require_GET
def trainer(request):
    return JsonResponse({"name": request.user.username, "party": request.user.pokemon.count()})
