from .trainers.rename import rename_trainer


def main() -> None:
    renamed = rename_trainer(1, "Red")
    print(f"Trainer {renamed.id} is now {renamed.name}")


if __name__ == "__main__":
    main()
