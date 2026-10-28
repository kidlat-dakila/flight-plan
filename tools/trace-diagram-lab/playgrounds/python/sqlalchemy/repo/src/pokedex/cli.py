import sys

from pokedex.reports import team_report


def main() -> None:
    trainer_id = int(sys.argv[1])
    print(team_report(trainer_id))


if __name__ == "__main__":
    main()
