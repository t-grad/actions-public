import * as core from '@actions/core'
import {context, getOctokit} from '@actions/github'

async function main(): Promise<void> {
  try {
    const token = core.getInput('github-token', {required: true})
    const github = getOctokit(token)

    const commit_sha = core.getInput('commit-sha', {required: true})
    const prs = await github.repos.listPullRequestsAssociatedWithCommit({
      ...context.repo,
      commit_sha
    })

    const result = []
    for (const pr of prs.data) {
      const merged = await github.pulls.checkIfMerged({
        ...context.repo,
        pull_number: pr.number
      })
      result.push({pr: pr.number, merged})
    }

    core.setOutput('prs', JSON.stringify(result))
  } catch (error) {
    core.setFailed(error.message)
  }
}

main()
