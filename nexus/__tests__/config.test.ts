import * as fs from 'fs'
import {parse, DEFAULT_AUTH, DEFAULT_POLICIES} from '../src/config'
import {dedent as ml} from 'ts-dedent'

const content = fs.readFileSync('../.github/nexus.yml', {
  encoding: 'utf-8',
  flag: 'r'
})

const baseUrl = 'https://nexus.example.com'
const otherUrl = 'https://other.nexus'

const config = parse(content)
const emptyConfig = parse('# empty', otherUrl)

test('nexus.yml url', () => {
  expect(config.baseUrl).toBe(baseUrl)
})

test('input url', () => {
  expect(emptyConfig.baseUrl).toBe(otherUrl)
})

describe('auth', () => {
  test('has implicit default config', () => {
    expect(emptyConfig.auth.default).toEqual(DEFAULT_AUTH.default)
  })

  test('hes defaults', () => {
    expect(config.auth).toHaveProperty('default')
    expect(config.auth.default).toEqual({
      username: 'MAVEN_USERNAME',
      password: 'MAVEN_PASSWORD'
    })
  })

  test('has override', () => {
    expect(config.auth).toHaveProperty('nexus-public')
    expect(config.auth['nexus-public']).toEqual({
      username: 'MAVEN_USERNAME',
      password: 'MAVEN_PUBLIC_PASSWORD'
    })
  })

  test('has implicit auth config', () => {
    expect(config.auth).toHaveProperty('extra')
    expect(config.auth['extra']).toEqual(config.auth.default)
  })
})

describe('repos', () => {
  test('has 3 elements', () => {
    expect(config.repos).toHaveProperty('nexus')
    expect(config.repos).toHaveProperty('nexus-thirdparty')
    expect(config.repos).toHaveProperty('extra')
  })

  describe('nexus', () => {
    const repo = config.repos['nexus']

    test('is present', () => {
      expect(repo).toBeDefined()

      expect(repo.repo).toBe('releases')
      expect(repo.auth).toBeTruthy()
    })

    test('has correct policies', () => {
      expect(repo.releases).toEqual({
        enabled: true,
        checksumPolicy: 'warn',
        updatePolicy: 'daily'
      })

      expect(repo.snapshots).toEqual({
        enabled: true,
        checksumPolicy: 'warn',
        updatePolicy: 'always'
      })
    })
  })

  describe('nexus-thirdparty', () => {
    const repo = config.repos['nexus-thirdparty']

    test('is present', () => {
      expect(repo).toBeDefined()

      expect(repo.repo).toBe('thirdparty')
      expect(repo.auth).toBeFalsy()
    })

    test('has correct policies', () => {
      expect(repo.releases).toEqual({
        enabled: true,
        checksumPolicy: 'fail',
        updatePolicy: 'daily'
      })

      expect(repo.snapshots).toEqual({
        enabled: false,
        checksumPolicy: DEFAULT_POLICIES.snapshots?.checksumPolicy,
        updatePolicy: 5
      })
    })
  })
})

describe('plugin-repos', () => {
  test('has 1 element', () => {
    expect(config.pluginRepos).toHaveProperty('nexus-public')
  })

  describe('nexus-public', () => {
    const repo = config.pluginRepos['nexus-public']

    test('is present', () => {
      expect(repo).toBeDefined()

      expect(repo.repo).toBe('public')
      expect(repo.auth).toBeTruthy()
    })

    test('has correct policies', () => {
      expect(repo.releases).toEqual({
        enabled: true,
        checksumPolicy: 'warn',
        updatePolicy: 'always'
      })

      expect(repo.snapshots).toEqual({
        enabled: false,
        checksumPolicy: DEFAULT_POLICIES.snapshots?.checksumPolicy,
        updatePolicy: 10
      })
    })
  })
})
