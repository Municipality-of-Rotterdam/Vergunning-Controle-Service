import { existsSync } from 'fs'
import { readFile, unlink, writeFile } from 'fs/promises'
import gltfPipeline from 'gltf-pipeline'

import { createExecutor } from '@helpers/executeCommand.js'
import { getOperatingSystem } from '@helpers/getOperatingSystem.js'
import { createLogger } from '@helpers/logger.js'
import { StepContext } from '@root/core/executeSteps.js'

const { glbToGltf } = gltfPipeline
const executeCommand = createExecutor('verrijking', import.meta, 'gltf')
const log = createLogger('verrijking', import.meta)
const gebouwFileName = '3Dgebouw'

export default async function Gltf({
  outputsDir,
  inputIfc,
  args,
}: Pick<StepContext, 'outputsDir' | 'inputIfc' | 'args'>) {
  const operatingSystem = getOperatingSystem()
  const ifConvertPath = `./src/tools/ifc-convert/${operatingSystem}/IfcConvert`
  const glbOutput = `${outputsDir}/${gebouwFileName}.glb`

  if (!existsSync(glbOutput) || args.clean) {
    log(`.glb extract maken`, '3D model')

    try {
      await unlink(glbOutput)
    } catch {}

    const command = `${ifConvertPath} "${inputIfc}" "${outputsDir}/${gebouwFileName}.glb"`
    await executeCommand(command)

    log(`.glb extract gemaakt`, '3D model')
  } else {
    log(`.glb van cache`, '3D model')
  }

  const gltfOutput = `${outputsDir}/${gebouwFileName}.gltf`

  if (!existsSync(gltfOutput) || args.clean) {
    log(`.gltf extract maken`, '3D model')

    try {
      await unlink(gltfOutput)
    } catch {}

    const glb = await readFile(glbOutput)
    const { gltf } = await glbToGltf(glb)
    await writeFile(gltfOutput, JSON.stringify(gltf), 'utf8')

    log(`.gltf extract gemaakt`, '3D model')
  } else {
    log(`.gltf van cache`, '3D model')
  }

  return {}
}
