import type { SelectedAuthors } from "@/procedures/add-repository/utils/find-selected-authors"
import type { ListedRepository } from "@/procedures/add-repository/utils/plan-repository-addition"
import { withRepository } from "@/procedures/add-setup-repository/utils/plan-setup-repository"
import type { SetupRepository } from "@/procedures/get-setup/utils/setup"
import type { SetupStore } from "@/procedures/get-setup/utils/setup-store"
import { buildRepository, type RepositoryInspection } from "@/procedures/list-repositories/utils/build-repository"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import type { RepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { withoutRepository } from "@/procedures/remove-setup-repository/utils/without-repository"
import { withAuthors } from "@/procedures/set-author-tracking/utils/author-tracking"
import type { RepositoryInspector } from "@/utils/repository-inspector"
import type { TargetMemoryStore } from "@/utils/target-memory-file-store"

export interface LiveRepositoryStoreDependencies {
  readonly setupStore: SetupStore
  readonly inspector: Pick<RepositoryInspector, "inspect" | "forget">
  readonly targetMemory: TargetMemoryStore
  readonly now: () => Date
}

export class LiveRepositoryStore implements RepositoryStore {
  public readonly notice = null
  private readonly dependencies: LiveRepositoryStoreDependencies

  public constructor(dependencies: LiveRepositoryStoreDependencies) {
    this.dependencies = dependencies
  }

  public readonly list = async (): Promise<readonly Repository[]> => {
    const setup = await this.dependencies.setupStore.read()
    return await Promise.all(setup.repositories.map(async (registered) => await this.describe(registered, setup.forges)))
  }

  public readonly listRegistered = async (): Promise<readonly ListedRepository[]> =>
    (await this.dependencies.setupStore.read()).repositories.map(({ name, path }) => ({ name, path }))

  public readonly add = async (repository: Repository, authors: SelectedAuthors): Promise<void> => {
    const setup = await this.dependencies.setupStore.read()
    if (setup.repositories.some((registered) => registered.path === repository.path)) return
    await this.dependencies.setupStore.write(
      withRepository(setup, { name: repository.name, path: repository.path, ...authors }),
    )
  }

  public readonly readAuthors = async (repositoryName: string): Promise<SelectedAuthors | null> => {
    const setup = await this.dependencies.setupStore.read()
    const registered = setup.repositories.find((listed) => listed.name === repositoryName)
    return registered === undefined
      ? null
      : { selfAuthor: registered.selfAuthor, trackedAuthors: registered.trackedAuthors }
  }

  public readonly readViewerLogin = async (repositoryName: string): Promise<string | null> => {
    const setup = await this.dependencies.setupStore.read()
    const registered = setup.repositories.find((listed) => listed.name === repositoryName)
    if (registered === undefined) return null
    return (await this.inspect(registered, setup.forges)).snapshot?.viewerLogin ?? null
  }

  public readonly refresh = async (repositoryName: string): Promise<void> => {
    const setup = await this.dependencies.setupStore.read()
    const registered = setup.repositories.find((listed) => listed.name === repositoryName)
    if (registered !== undefined) this.dependencies.inspector.forget(registered.path)
  }

  public readonly replaceAuthors = async (repositoryName: string, authors: SelectedAuthors): Promise<boolean> => {
    const setup = await this.dependencies.setupStore.read()
    if (!setup.repositories.some((listed) => listed.name === repositoryName)) return false
    await this.dependencies.setupStore.write(withAuthors(setup, repositoryName, authors))
    return true
  }

  public readonly remove = async (repositoryName: string): Promise<boolean> => {
    const withoutRemoved = withoutRepository(await this.dependencies.setupStore.read(), repositoryName)
    if (withoutRemoved === null) return false
    await this.dependencies.setupStore.write(withoutRemoved)
    return true
  }

  public readonly dismissNewTarget = async (repositoryName: string, targetId: string): Promise<Repository | null> => {
    const repository = (await this.list()).find((listed) => listed.name === repositoryName)
    if (repository?.targets.some((target) => targetIdOf(target) === targetId) !== true) return null
    await this.dependencies.targetMemory.dismiss(repositoryName, targetId, this.dependencies.now())
    return (await this.list()).find((listed) => listed.name === repositoryName) ?? null
  }

  private readonly describe = async (
    registered: SetupRepository,
    forges: Parameters<RepositoryInspector["inspect"]>[0]["forges"],
  ): Promise<Repository> => {
    const [inspection, memory] = await Promise.all([
      this.inspect(registered, forges),
      this.dependencies.targetMemory.ensure(registered.name, this.dependencies.now()),
    ])
    return buildRepository(registered, inspection, memory)
  }

  private readonly inspect = async (
    registered: SetupRepository,
    forges: Parameters<RepositoryInspector["inspect"]>[0]["forges"],
  ): Promise<RepositoryInspection> =>
    await this.dependencies.inspector.inspect({
      path: registered.path,
      forges,
      trackedAuthorIds: registered.trackedAuthors.map((author) => author.id),
      selfAuthorId: registered.selfAuthor?.id ?? null,
    })
}
