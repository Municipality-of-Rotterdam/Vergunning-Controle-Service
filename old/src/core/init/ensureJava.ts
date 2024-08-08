import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'

const executeCommand = createExecutor('init', import.meta)
const log = createLogger('init', import.meta)

export const ensureJava = async () => {
  try {
    const javaVersionOutput = await executeCommand('java --version')
    const javaVersion = javaVersionOutput.split('\n')[0]
    log(`version: ${javaVersion}`, 'Java')
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      log(`Java is not installed`, 'Java')
      throw new Error('Could not find Java in the environment, is it installed?')
    } else {
      throw new Error('Unknown error while checking for Java')
    }
  }
}
