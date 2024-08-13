import os from 'os'

export const getOperatingSystem = () => {
  const platform = os.platform()
  const arch = os.arch()

  switch (platform) {
    case 'darwin':
      if (arch === 'arm64' && os.platform() === 'darwin') {
        return 'macos-m1-64'
      } else {
        return 'macos64'
      }
    case 'win32':
      if (arch === 'x64') {
        return 'win64'
      }
    case 'linux':
      if (arch === 'x64') {
        return 'linux64'
      }
    default:
      throw new Error(`Operating System not recognized! Got platform: ${platform}, with architecture: ${arch}`)
  }
}
