import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'

const executeCommand = createExecutor('init', import.meta)
const log = createLogger('init', import.meta)

export const ensurePython = async () => {
  try {
    const pythonVersionOutput = await executeCommand('python3 --version')
    const pythonVersion = pythonVersionOutput.split('\n')[0]
    log(`version: ${pythonVersion}`, 'Python3')
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      log(`Python3 is not installed`, 'Python3')
      throw new Error('Could not find Python3 in the environment, is it installed?')
    } else {
      throw new Error(`Unknown error while checking for Python3: ${(error as Error).message}`)
    }
  }
}
