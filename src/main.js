import core from '@actions/core'
import tool from '@actions/tool-cache'
import exec from '@actions/exec'
import github from '@actions/github'
import path from 'node:path'

export async function fslabscliDownload() {
  const version = core.getInput('version')

  const fslabscliPackages = [
    {
      arch: 'x64',
      platform: 'linux',
      name: 'cargo-fslabscli-x86_64-unknown-linux-musl',
    },
    {
      arch: 'arm64',
      platform: 'darwin',
      name: 'cargo-fslabscli-aarch64-apple-darwin',
    },
  ]

  const fslabscliPackage = fslabscliPackages.find(
    x => x.platform === process.platform && x.arch === process.arch
  )
  if (!fslabscliPackage) {
    throw new Error(
      `Unsupported platform ${process.platform} and arch ${process.arch}`
    )
  }

  core.info(`Downloading ${fslabscliPackage.name}`)
  const token = core.getInput('token')
  const octokit = github.getOctokit(token)
  const {
    data: {assets},
  } = await octokit.rest.repos.getReleaseByTag({
    owner: 'ForesightMiningSoftwareCorporation',
    repo: 'fslabscli',
    tag: `cargo-fslabscli-${version}`,
  })
  const asset = assets.find(asset => asset.name.includes(fslabscliPackage.name))
  const downloadPath = await tool.downloadTool(
    asset.url,
    'fslabscli',
    `Bearer ${core.getInput('token')}`,
    {
      accept: 'application/octet-stream',
      'user-agent': 'FSLABScli action',
    }
  )

  core.debug('Adding to the cache ...')
  const cachedPath = await tool.cacheFile(
    downloadPath,
    'fslabscli',
    'fslabscli',
    version,
    process.arch
  )

  if (process.platform == 'linux' || process.platform == 'darwin') {
    await exec.exec('chmod', ['+x', path.join(cachedPath, 'fslabscli')])
  }

  core.addPath(cachedPath)

  core.info(`Downloaded to ${cachedPath}`)
}

export async function fslabscliVersion() {
  core.info('Show fslabscli version')
  await exec.exec('fslabscli --version')
}

export async function run() {
  try {
    await fslabscliDownload()
    await fslabscliVersion()
    process.exitCode = core.ExitCode.Success
  } catch (error) {
    core.setFailed(error.message)
  }
}
