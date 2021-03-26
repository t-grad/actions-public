import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as core from '@actions/core'
import * as io from '@actions/io'
import {create as xmlCreate} from 'xmlbuilder2'
import {dedent as ml} from 'ts-dedent'

const M2_DIR = '.m2'
const SETTINGS_FILE = 'settings.xml'

interface RepoConfig {
  enabled: boolean
  checksumPolicy?: string
  updatePolicy?: string
}

interface Repo {
  id: string
  repo: string
  auth?: boolean
  releases?: RepoConfig
  snapshots?: RepoConfig
}

async function main(): Promise<void> {
  try {
    const url = core.getInput('base-url', {required: true})
    const id = core.getInput('id', {required: true})
    const username = core.getInput('username', {required: true})
    const password = core.getInput('password', {required: true})

    const repos: Repo[] = JSON.parse(core.getInput('repos', {required: true}))
    const pluginRepos: Repo[] = JSON.parse(
      core.getInput('plugin-repos', {required: true})
    )

    const settingsPath = core.getInput('settings-path', {required: false})

    core.info(ml`
      creating ${SETTINGS_FILE} with primary server/id: ${id}
      repos: ${repos}
      plugin-repos: ${pluginRepos}
      environment variables:
        username=$${username}
        password=$${password}
    `)

    // when an alternate m2 location is specified use only that location (no .m2 directory)
    // otherwise use the home/.m2/ path
    const settingsDir: string = path.join(
      settingsPath || os.homedir(),
      settingsPath ? '' : M2_DIR
    )
    await io.mkdirP(settingsDir)

    await write(
      settingsDir,
      generate(id, username, password, url, repos, pluginRepos)
    )
  } catch (error) {
    core.setFailed(error.message)
  }
}

function generateRepo(baseUrl: string, repo: Repo): {[key: string]: any} {
  return {
    id: repo.id,
    url: `${baseUrl}/repository/${repo.repo}`,
    releases: repo.releases,
    snapshots: repo.snapshots
  }
}

function generate(
  id: string,
  username: string,
  password: string,
  url: string,
  repos: Repo[],
  pluginRepos: Repo[]
): string {
  const rs: Set<string> = new Set([id])
  for (const r of repos) {
    if (r.auth) rs.add(r.id)
  }
  for (const r of pluginRepos) {
    if (r.auth) rs.add(r.id)
  }
  const authenticatedRepos: string[] = [...rs]

  const xmlObj: {[key: string]: any} = {
    settings: {
      '@xmlns': 'http://maven.apache.org/SETTINGS/1.0.0',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@xsi:schemaLocation':
        'http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd',

      activeProfiles: {
        activeProfile: ['nexus']
      },

      profiles: {
        profile: [
          {
            id: 'nexus',
            properties: {
              'nexus.url': url
            },
            repositories: {
              repository: repos.map(r => generateRepo(url, r))
            },
            pluginRepositories: {
              pluginRepository: pluginRepos.map(r => generateRepo(url, r))
            }
          }
        ]
      },
      servers: {
        server: authenticatedRepos.map(r => {
          return {
            id: r,
            username: `\${env.${username}}`,
            password: `\${env.${password}}`
          }
        })
      }
    }
  }

  return xmlCreate(xmlObj).end({headless: true, prettyPrint: true, width: 80})
}

async function write(directory: string, settings: string): Promise<void> {
  const location = path.join(directory, SETTINGS_FILE)
  if (fs.existsSync(location)) {
    core.warning(`overwriting existing file ${location}`)
  } else {
    core.info(`writing ${location}`)
  }

  return fs.writeFileSync(location, settings, {
    encoding: 'utf-8',
    flag: 'w'
  })
}

main()
