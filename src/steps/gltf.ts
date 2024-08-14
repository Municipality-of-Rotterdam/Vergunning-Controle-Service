import { existsSync } from 'fs';
import { readFile, unlink, writeFile } from 'fs/promises';
import gltfPipeline from 'gltf-pipeline';
import path from 'path';

import { checkAssetExistence } from '@root/helpers/existence.js';
import { getOperatingSystem } from '@root/helpers/getOperatingSystem.js';
import { SKIP_STEP } from '@root/helpers/skipStep.js';
import { uploadAsset } from '@root/helpers/uploadAsset.js';
import { execWithProvenance } from '@root/provenance/execWithProvenance.js';
import { Context, Step } from '@root/types.js';

const { glbToGltf } = gltfPipeline

export default {
  name: '3D model bouwen',
  description: '',
  run: async (context: Context) => {
    const allAssetsExists = await checkAssetExistence(context.buildingDataset, ['model-3d.glb', 'model-3d.gltf'])
    if (context.cache && allAssetsExists) return SKIP_STEP

    const operatingSystem = getOperatingSystem()
    const ifConvertPath = path.join('tools', 'ifc-convert', operatingSystem, 'IfcConvert')
    const glbOutput = path.join(context.outputsDir!, `model-3d.glb`)
    const gltfOutput = path.join(context.outputsDir!, `model-3d.gltf`)

    if (existsSync(glbOutput)) await unlink(glbOutput)
    await execWithProvenance(`${ifConvertPath} "${context.ifcFile}" "${glbOutput}"`)

    if (existsSync(gltfOutput)) await unlink(gltfOutput)
    const glb = await readFile(glbOutput)
    const { gltf } = await glbToGltf(glb)
    await writeFile(gltfOutput, JSON.stringify(gltf), 'utf8')

    await uploadAsset(context.buildingDataset, glbOutput)
    await uploadAsset(context.buildingDataset, gltfOutput)
  },
} satisfies Step
