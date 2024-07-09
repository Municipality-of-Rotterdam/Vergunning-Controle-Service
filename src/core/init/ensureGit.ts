import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'

const executeCommand = createExecutor('init', import.meta)
const log = createLogger('init', import.meta)

export const ensureGit = async () => {
  try {
    const gitVersionOutput = await executeCommand('git --version')
    const gitVersion = gitVersionOutput.split('\n')[0]
    log(`version: ${gitVersion}`, 'Git')
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      log(`Git is not installed`, 'Git')
      throw new Error('Could not find Git in the environment, is it installed?')
    } else {
      throw new Error(`Unknown error while checking for Git: ${(error as Error).message}`)
    }
  }
}
