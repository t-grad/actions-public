import * as yaml from 'yaml'

type RepoChecksumPolicy = 'fail' | 'warn'
type RepoUpdatePolicyInterval = number
type RepoUpdatePolicy = 'always' | 'daily' | 'never ' | RepoUpdatePolicyInterval

export interface Config {
  baseUrl: string
  auth: AuthConfig
  repos: {[key: string]: RepoConfig}
  pluginRepos: {[key: string]: RepoConfig}
}

interface AuthConfig {
  default: Credentials

  [key: string]: Credentials
}

interface Credentials {
  username?: string
  password?: string
}

export interface RepoConfig extends RepoPolicyConfig {
  repo: string
  auth?: boolean
}

type RepoConfigMap = {[key: string]: RepoConfig}

interface RepoPolicyConfig {
  releases?: RepoPolicy
  snapshots?: RepoPolicy
}

interface RepoPolicy {
  enabled?: boolean
  checksumPolicy?: RepoChecksumPolicy
  updatePolicy?: RepoUpdatePolicy
}

export const DEFAULT_AUTH = {
  default: {
    username: 'NEXUS_USERNAME',
    password: 'NEXUS_PASSWORD'
  }
}

export const DEFAULT_POLICIES: RepoPolicyConfig = {
  releases: {
    enabled: true,
    checksumPolicy: 'fail',
    updatePolicy: 'daily'
  },
  snapshots: {
    enabled: false,
    checksumPolicy: 'fail',
    updatePolicy: 'always'
  }
}

function setDefaultPolicies(
  repos: RepoConfigMap,
  configPolicies?: RepoPolicyConfig
): void {
  const defaults: RepoPolicyConfig = {
    releases: {...DEFAULT_POLICIES.releases, ...configPolicies?.releases},
    snapshots: {...DEFAULT_POLICIES.snapshots, ...configPolicies?.snapshots}
  }

  for (const r of Object.values(repos)) {
    r.releases = {...defaults.releases, ...(r.releases || {})}
    r.snapshots = {...defaults.snapshots, ...(r.snapshots || {})}
  }
}

export function parse(content: string, repoUrl?: string): Config {
  const parsed = yaml.parse(content) || {}

  const baseUrl = repoUrl || parsed['url']
  if (!baseUrl) {
    throw Error(
      'Nexus base url should be specified via nexus.yml#url or base-url input'
    )
  }

  const repos: RepoConfigMap = parsed['repos'] || []
  const pluginRepos: RepoConfigMap = parsed['plugin-repos'] || []

  setDefaultPolicies(repos, parsed['default-policies'])
  setDefaultPolicies(pluginRepos, parsed['default-policies'])

  const auth: AuthConfig = parsed['auth'] || DEFAULT_AUTH
  for (const a of Object.values(auth)) {
    a.username = a.username || auth.default.username
    a.password = a.password || auth.default.password
  }
  for (const [id, r] of Object.entries(repos)) {
    if (r.auth && !auth[id]) {
      auth[id] = auth.default
    }
  }

  return {baseUrl, auth, repos, pluginRepos}
}
