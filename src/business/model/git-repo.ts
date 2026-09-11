export type GitRepoInfo = {
  gitDir: string
  toplevel: string
}

export type GitRepoDetection = (GitRepoInfo & { status: 'repo' }) | { status: 'not-repo' }
