REGIONS = {"kanto": "Pallet Town", "johto": "New Bark Town"}


def starting_town(region: str) -> str | None:
    return REGIONS.get(region)
