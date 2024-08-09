import argsParser from 'args-parser'
import fs, { mkdir } from 'fs/promises'
import * as path from 'path'
import { rimraf } from 'rimraf'

import { Context } from '../types.js'
import { ensureBuildingDataset } from './ensureBuildingDataset.js'
import { fetchAssetByName } from './fetchAssetByName.js'

export const establishContext = async (): Promise<Context> => {
  const args = argsParser(process.argv)

  let ifcFileName = args.ifc
  // An .ifc has been uploaded and an HTTP calls has been done to GitLab.
  if (process.env.TRIGGER_PAYLOAD) {
    const triggerFileData = await fs.readFile(process.env.TRIGGER_PAYLOAD, 'utf8')
    const triggerData = JSON.parse(triggerFileData)
    const triggerAsset = triggerData.assets?.[0]?.assetName
    if (triggerAsset && triggerAsset.endsWith('.ifc')) ifcFileName = triggerAsset
  }

  const buildingName: string = args.ifc.replaceAll('.ifc', '').replace(/[^a-zA-Z]+/g, '')
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = (now.getDate() + 1).toString().padStart(2, '0')
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')

  // There is a max for dataset name lengths of 40 characters.
  const datasetName = `${buildingName.substring(0, 18)}--${year}-${month}-${day}--${hours}-${minutes}-${seconds}`

  const context: Context = {
    outputsDir: path.join('outputs', datasetName),
    inputsDir: path.join('inputs', datasetName),
    ifcFile: path.join('inputs', datasetName, ifcFileName),
    idsFile: path.join('inputs', datasetName, args.ids),
  }

  await ensureBuildingDataset(datasetName)

  if (!args.cache) {
    await rimraf(context.outputsDir!)
    await mkdir(context.outputsDir!)
    await rimraf(context.inputsDir!)
    await mkdir(context.inputsDir!)

    await fetchAssetByName(ifcFileName, context.inputsDir)
    await fetchAssetByName(args.ids, context.inputsDir)
  }

  return context
}
