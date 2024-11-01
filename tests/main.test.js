import path from 'node:path'
import url from 'node:url'
import {promises as fs} from 'node:fs'
import {run, fslabscliDownload, fslabscliVersion} from 'src/main'
import {ExitCode} from '@actions/core'
import yaml from 'js-yaml'

const directory = path.dirname(url.fileURLToPath(import.meta.url))

const cachePath = path.join(directory, 'CACHE')
const temporaryPath = path.join(directory, 'TEMP')
// Set temp and tool directories before importing (used to set global state)
process.env['RUNNER_TEMP'] = temporaryPath
process.env['RUNNER_TOOL_CACHE'] = cachePath

// Read action.yaml file to get the version
const actionYaml = yaml.load(
  await fs.readFile(path.join(directory, '../action.yaml'))
)
const version = actionYaml.inputs.version.default
const versionWithoutV = version.startsWith('v') ? version.slice(1) : version

process.env['INPUT_VERSION'] = version
process.env['INPUT_TOKEN'] = process.env.GITHUB_TOKEN

const originalPlatform = process.platform
const originalArch = process.arch

const restorePlatformArch = () => {
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
  })
  Object.defineProperty(process, 'arch', {
    value: originalArch,
  })
}
const fakePlatformArch = (fakePlatform, fakeArch) => {
  Object.defineProperty(process, 'platform', {
    value: fakePlatform,
  })
  Object.defineProperty(process, 'arch', {
    value: fakeArch,
  })
}

describe('main', () => {
  it('run', async () => {
    await run()
    const file = path.join(
      cachePath,
      'cargo-fslabscli',
      versionWithoutV,
      process.arch,
      'cargo-fslabscli'
    )
    const fileStat = await fs.stat(file)
    expect(fileStat.isFile()).toBe(true)
    expect(process.exitCode).toBe(ExitCode.Success)
  })

  it('unknown platform', async () => {
    fakePlatformArch('foo', 'bar')
    await expect(
      fslabscliDownload()
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unsupported platform foo and arch bar"`
    )
    restorePlatformArch()
  })

  it('fslabscli not found', async () => {
    const path = process.env['PATH']
    process.env['PATH'] = ''
    await expect(fslabscliVersion()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unable to locate executable file: fslabscli. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also check the file mode to verify the file is executable."`
    )
    process.env['PATH'] = path
  })

  it('run unknown platform', async () => {
    fakePlatformArch('foo', 'bar')
    await run()
    expect(process.exitCode).toBe(ExitCode.Failure)
    restorePlatformArch()
  })

  it('linux should download', async () => {
    fakePlatformArch('linux', 'x64')
    await fslabscliDownload()
    const file = path.join(
      cachePath,
      'cargo-fslabscli',
      versionWithoutV,
      process.arch,
      'cargo-fslabscli'
    )
    const fileStat = await fs.stat(file)
    expect(fileStat.isFile()).toBe(true)
    restorePlatformArch()
  })
})

afterAll(async () => {
  await fs.rm(temporaryPath, {recursive: true})
  await fs.rm(cachePath, {recursive: true})
})
