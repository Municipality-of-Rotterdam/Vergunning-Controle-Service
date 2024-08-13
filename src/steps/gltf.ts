import { existsSync } from 'fs'
import { readFile, unlink, writeFile } from 'fs/promises'
import gltfPipeline from 'gltf-pipeline'

// import { createExecutor } from '@helpers/executeCommand.js'
// import { createLogger } from '@helpers/logger.js'
// import { StepContext } from '@root/core/executeSteps.js'
import { getOperatingSystem } from '@root/helpers/getOperatingSystem.js'
import path from 'path'

import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { execWithProvenance } from '@root/provenance/execWithProvenance.js'
import { Context, Step } from '@root/types.js'

const { glbToGltf } = gltfPipeline

export default {
  name: '3D model bouwen',
  description: '',
  run: async (context: Context) => {
    const operatingSystem = getOperatingSystem()
    const ifConvertPath = path.join('src', 'tools', 'ifc-convert', operatingSystem, 'IfcConvert')
    const glbOutput = path.join(context.outputsDir!, `${context.datasetName}.glb`)
    const gltfOutput = path.join(context.outputsDir!, `${context.datasetName}.gltf`)

    const command = `${ifConvertPath} "${context.ifcFile}" "${glbOutput}"`
    await execWithProvenance(command)

    const glb = await readFile(glbOutput)
    const { gltf } = await glbToGltf(glb)
    await writeFile(gltfOutput, JSON.stringify(gltf), 'utf8')
  },
} satisfies Step
