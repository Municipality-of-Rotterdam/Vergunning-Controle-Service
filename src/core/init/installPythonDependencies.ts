import { createExecutor } from '@helpers/executeCommand.js'

const executeCommand = createExecutor('init', import.meta)

export const installPythonDependencies = async () => {
  await executeCommand(`python3 -m pip install -r ./src/tools/requirements.txt --quiet`)
}
