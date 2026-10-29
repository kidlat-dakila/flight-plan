from .trainers.roster import TrainerRoster


def main() -> None:
    roster = TrainerRoster()
    print(roster.find_trainer(1))


if __name__ == "__main__":
    main()
