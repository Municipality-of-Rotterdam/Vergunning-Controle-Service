import argsParser from 'args-parser'
import { existsSync } from 'fs'
import fs, { mkdir } from 'fs/promises'
import * as path from 'path'
import { rimraf } from 'rimraf'

import App from '@triply/triplydb'

import { Context } from '../types.js'
import { ensureBuildingDataset } from './ensureBuildingDataset.js'
import { fetchAssetByName } from './fetchAssetByName.js'

export const establishContext = async (): Promise<Context> => {
  const args = argsParser(process.argv)

  let ifcFileName = args.ifc
  let idsFileName = args.ids

  if (!ifcFileName) throw new Error('IFC filename not provided')
  if (!idsFileName) throw new Error('IDS filename not provided')

  // An .ifc has been uploaded and an HTTP calls has been done to GitLab.
  if (process.env.TRIGGER_PAYLOAD) {
    const triggerFileData = await fs.readFile(process.env.TRIGGER_PAYLOAD, 'utf8')
    const triggerData = JSON.parse(triggerFileData)
    const triggerAsset = triggerData.assets?.[0]?.assetName
    if (triggerAsset && triggerAsset.endsWith('.ifc')) ifcFileName = triggerAsset
  }

  if (!args.ifc) throw new Error('VCS was started without an .ifc, please provide --ifc=IFC_ASSET_NAME')
  const buildingName: string = args.ifc.replaceAll('.ifc', '').replace(/[^a-zA-Z]+/g, '')

  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = (now.getDate() + 1).toString().padStart(2, '0')
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')

  // There is a max for dataset name lengths of 40 characters.
  const datasetName = args.dev
    ? buildingName.substring(0, 40)
    : `${buildingName.substring(0, 18)}--${year}-${month}-${day}--${hours}-${minutes}-${seconds}`

  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const user = await triply.getUser()
  const consoleUrl = (await triply.getInfo()).consoleUrl
  const userName = (await user.getInfo()).accountName
  const baseIRI = `${consoleUrl}/${userName}/${datasetName}/`

  const context: Context = {
    outputsDir: path.join('outputs', datasetName),
    inputsDir: path.join('inputs', buildingName),
    ifcFile: path.join('inputs', buildingName, ifcFileName),
    idsFile: path.join('inputs', buildingName, idsFileName),
    cache: args.cache,
    buildingDataset: await ensureBuildingDataset(datasetName),
    baseIRI,
    datasetName,
  }

  if (!context.cache || !existsSync(context.outputsDir)) {
    await rimraf(context.outputsDir!)
    await mkdir(context.outputsDir!, { recursive: true })
  }

  if (!context.cache || !existsSync(context.inputsDir)) {
    await rimraf(context.inputsDir!)
    await mkdir(context.inputsDir!, { recursive: true })
  }

  await fetchAssetByName(ifcFileName, context.inputsDir, context.cache)

  return context
}
