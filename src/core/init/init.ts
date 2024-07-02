import argsParser from 'args-parser'
import crypto from 'crypto'
import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { rimraf } from 'rimraf'

import { ensureJava } from '@core/init/ensureJava.js'
import { ensurePython } from '@core/init/ensurePython.js'
import { installPythonDependencies } from '@core/init/installPythonDependencies.js'
import { createLogger } from '@helpers/logger.js'
import { getAccount } from '@helpers/getAccount.js'
import App from '@triply/triplydb'
import Dataset from '@triply/triplydb/Dataset.js'
import { writeFile } from 'fs/promises'
import Asset from '@triply/triplydb/Asset.js'

const log = createLogger('init', import.meta)

export const baseIRI = 'https://demo.triplydb.com/rotterdam/'

export const init = async () => {
  dotenv.config()

  for (const variable of ['TRIPLYDB_TOKEN', 'RP_API_TOKEN'])
    if (!process.env[variable]) throw new Error(`Missing variable ${variable}`)

  const args = argsParser(process.argv)

  const datasetName = args.filename.replaceAll('.ifc', '').replace(/[^a-zA-Z]+/g, '')
  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const account = getAccount()
  const user = await triply.getAccount(account)

  let dataset: Dataset
  try {
    dataset = await user.getDataset(datasetName)
  } catch (error) {
    dataset = await user.addDataset(datasetName)
  }
  if (!dataset) throw new Error(`Kon de dataset ${datasetName} niet aanmaken in TriplyDB`)

  let vcsdataset: Dataset
  try {
    vcsdataset = await user.getDataset('vcs')
  } catch (error) {
    throw new Error(`Kon de dataset 'vcs' niet vinden in TriplyDB`)
  }

  const datasetInfo = await dataset.getInfo()
  const graphPrefix = datasetInfo.prefixes.find((item) => item.prefixLabel === 'graph')!
  log(account, 'Account')
  log(graphPrefix.iri.replace('/graphs/', ''), 'Dataset')

  await ensurePython()
  await ensureJava()
  await installPythonDependencies()

  const clean = args.clean

  const ruleIds = args.controles
    ? (args.controles?.toString() ?? '').split(',').map((number: string) => parseInt(number))
    : []

  if (!args.filename) throw new Error('No filename was provided')

  log(args, 'Script argumenten')

  const outputsDir = import.meta
    .resolve(`../../../outputs/${datasetName}/`)
    .replace('file://', '')
    .replace('/index.js', '')
  log(outputsDir, 'Resultaten folder')

  if (clean) {
    await rimraf(outputsDir)
    log(outputsDir, 'Resultaten folder opgeschoond')
  }
  if (!existsSync(outputsDir)) {
    await mkdir(outputsDir)
    log(outputsDir, 'Resultaten folder aangemaakt')
  }

  const ifcDir = import.meta
    .resolve(`../../../input/ifc/${datasetName}/`)
    .replace('file://', '')
    .replace('/index.js', '')
  log(ifcDir, 'Input IFC folder')

  if (clean) {
    await rimraf(ifcDir)
    log(ifcDir, 'Input IFC folder opgeschoond')
  }
  if (!existsSync(ifcDir)) {
    await mkdir(ifcDir)
    log(ifcDir, 'Input IFC folder aangemaakt')
  }

  const ifcOutput = `${ifcDir}/${args.filename}`

  console.log(args.filename)
  let asset: Asset
  try {
    asset = await vcsdataset.getAsset(args.filename)
  } catch (error) {
    throw new Error(`Kon het IFC asset niet vinden in TriplyDB`)
  }

  // write asset to input ifc directory
  await writeFile(ifcOutput, asset.toStream(), 'utf8')

  const inputIfc = import.meta.resolve(`../../../input/ifc/${args.filename}`).replace('file://', '')
  const identifier = crypto.createHash('md5').update(inputIfc).digest('hex')

  return {
    baseIRI,
    account,
    datasetName,
    ruleIds,
    outputsDir,
    inputIfc,
    args,
    identifier,
  }
}
