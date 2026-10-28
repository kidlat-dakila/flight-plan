import sys
from pathlib import Path

from pydantic import ValidationError

from pokedex.importer import read_trainer


def main() -> None:
    try:
        trainer = read_trainer(Path(sys.argv[1]))
    except ValidationError as error:
        print(error)
        raise SystemExit(1)
    print(f"{trainer.name} has {len(trainer.team)} Pokemon")


if __name__ == "__main__":
    main()
