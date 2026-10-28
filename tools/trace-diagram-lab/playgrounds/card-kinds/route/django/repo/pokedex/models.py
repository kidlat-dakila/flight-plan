from django.conf import settings
from django.db import models


class Pokemon(models.Model):
    trainer = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="pokemon", on_delete=models.CASCADE)
    name = models.CharField(max_length=20)
    level = models.PositiveSmallIntegerField(default=5)

    def as_dict(self):
        return {"id": self.pk, "name": self.name, "level": self.level}
