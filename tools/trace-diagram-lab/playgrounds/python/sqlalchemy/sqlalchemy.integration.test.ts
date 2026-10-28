import { join } from "node:path"
import { buildBranchCodegraph } from "@flightplan/codegraph"
import { assembleGitAdapter, type GitAdapter } from "@flightplan/git-forge"
import { CASE_REF, setupTest } from "@flightplan/playground-fixtures/test-setup"
import { expectTraceSnapshot } from "@test-setup/trace-snapshot"

const REPO_PATH = join(import.meta.dirname, "repo")

const openRepository = async (root: string): Promise<GitAdapter> => {
  const resolved = await assembleGitAdapter({ id: "git", root, secret: null, username: "", baseUrl: "" })
  if (!resolved.ok) throw resolved.error
  return resolved.gitAdapter
}

describe("python/sqlalchemy", () => {
  it("Implement function trade_pokemon", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/pokedex/trades/models.py b/src/pokedex/trades/models.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/trades/models.py",
          "@@ -0,0 +1,18 @@",
          "+from datetime import datetime",
          "+",
          "+from sqlalchemy import ForeignKey, func",
          "+from sqlalchemy.orm import Mapped, mapped_column, relationship",
          "+",
          "+from pokedex.database import Base",
          "+from pokedex.models import Pokemon",
          "+",
          "+",
          "+class Trade(Base):",
          "+    __tablename__ = \"trades\"",
          "+",
          "+    id: Mapped[int] = mapped_column(primary_key=True)",
          "+    pokemon_id: Mapped[int] = mapped_column(ForeignKey(\"pokemon.id\"))",
          "+    from_trainer_id: Mapped[int] = mapped_column(ForeignKey(\"trainers.id\"))",
          "+    to_trainer_id: Mapped[int] = mapped_column(ForeignKey(\"trainers.id\"))",
          "+    traded_at: Mapped[datetime] = mapped_column(server_default=func.now())",
          "+    pokemon: Mapped[Pokemon] = relationship()",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/trades/queries.py b/src/pokedex/trades/queries.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/trades/queries.py",
          "@@ -0,0 +1,16 @@",
          "+from sqlalchemy import select",
          "+from sqlalchemy.orm import Session",
          "+",
          "+from pokedex.models import Pokemon, Trainer",
          "+from pokedex.trades.models import Trade",
          "+",
          "+",
          "+def find_pokemon(session: Session, pokemon_id: int) -> Pokemon:",
          "+    return session.scalars(select(Pokemon).where(Pokemon.id == pokemon_id)).one()",
          "+",
          "+",
          "+def save_trade(session: Session, pokemon: Pokemon, to_trainer: Trainer) -> Trade:",
          "+    trade = Trade(pokemon=pokemon, from_trainer_id=pokemon.trainer_id, to_trainer_id=to_trainer.id)",
          "+    pokemon.trainer = to_trainer",
          "+    session.add(trade)",
          "+    return trade",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/trades/service.py b/src/pokedex/trades/service.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/trades/service.py",
          "@@ -0,0 +1,14 @@",
          "+from sqlalchemy.orm import Session",
          "+",
          "+from pokedex.database import engine",
          "+from pokedex.trades.queries import find_pokemon, save_trade",
          "+from pokedex.trainers.queries import find_trainer",
          "+",
          "+",
          "+def trade_pokemon(pokemon_id: int, trainer_id: int) -> int:",
          "+    with Session(engine) as session:",
          "+        pokemon = find_pokemon(session, pokemon_id)",
          "+        trainer = find_trainer(session, trainer_id)",
          "+        trade = save_trade(session, pokemon, trainer)",
          "+        session.commit()",
          "+        return trade.id",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/cli.py b/src/pokedex/cli.py",
          "--- a/src/pokedex/cli.py",
          "+++ b/src/pokedex/cli.py",
          "@@ -3,0 +4 @@ from pokedex.reports import team_report",
          "+from pokedex.trades.service import trade_pokemon",
          "@@ -6,0 +8,4 @@ def main() -> None:",
          "+    if sys.argv[1] == \"trade\":",
          "+        trade_pokemon(int(sys.argv[2]), int(sys.argv[3]))",
          "+        print(team_report(int(sys.argv[3])))",
          "+        return",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
