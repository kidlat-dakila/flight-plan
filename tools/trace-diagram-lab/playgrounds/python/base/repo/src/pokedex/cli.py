from .display.formatting import describe_team
from .models import Pokemon, Trainer
from .team import Team


def build_starter_team() -> Team:
    team = Team(Trainer(name="Ash", hometown="Pallet Town"))
    team.add(Pokemon(name="Pikachu", types=("electric",)))
    team.add(Pokemon(name="Bulbasaur", types=("grass", "poison")))
    return team


def main() -> None:
    team = build_starter_team()
    print(describe_team(team))


if __name__ == "__main__":
    main()
