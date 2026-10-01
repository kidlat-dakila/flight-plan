const EmptyRepositoryIndex = () => (
  <section className="max-w-prose border-t border-border pt-5">
    <h2 className="text-lg font-bold">No repositories yet</h2>
    <p className="mt-1 text-muted-foreground">
      Flight Plan lists the repository it is started in. Start it inside a repository, or add one here by its folder
      path. Each repository then shows its open pull requests and branches, with the status of their reviews.
    </p>
  </section>
)

export default EmptyRepositoryIndex
