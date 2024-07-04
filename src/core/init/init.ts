import argsParser from 'args-parser'
import crypto from 'crypto'
import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { rimraf } from 'rimraf'

import { ensureJava } from '@core/init/ensureJava.js'
import { ensurePython } from '@core/init/ensurePython.js'
import { installPythonDependencies } from '@core/init/installPythonDependencies.js'
import { getAccount } from '@helpers/getAccount.js'
import { createLogger } from '@helpers/logger.js'
import App from '@triply/triplydb'
import Asset from '@triply/triplydb/Asset.js'
import Dataset from '@triply/triplydb/Dataset.js'
import Provenance from '../Provenance.js'

const log = createLogger('init', import.meta)

// TODO: depends on token
export const baseIRI = 'https://demo.triplydb.com/rotterdam/'

export const init = async () => {
  dotenv.config()

  for (const variable of ['TRIPLYDB_TOKEN', 'RP_API_TOKEN'])
    if (!process.env[variable]) throw new Error(`Missing variable ${variable}`)

  const args = argsParser(process.argv)

  const datasetName = args.ifc.replaceAll('.ifc', '').replace(/[^a-zA-Z]+/g, '')
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

  let vcsDataset: Dataset
  try {
    vcsDataset = await user.getDataset('vcs')
  } catch (error) {
    throw new Error(`Kon de dataset 'vcs' van gebruiker ${(await user.getInfo()).accountName} niet vinden in TriplyDB`)
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

  if (!args.ifc) throw new Error('No IFC filename was provided')
  if (!args.ids) throw new Error('No IDS filename was provided')

  log(args, 'Script argumenten')

  const inputIds = import.meta.resolve(`../../../input/${args.ids}`).replace('file://', '')
  const idsIdentifier = crypto.createHash('md5').update(inputIds).digest('hex')

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

  const ifcDir = import.meta.resolve(`../../../input/ifc/`).replace('file://', '').replace('/index.js', '')

  if (clean) {
    await rimraf(ifcDir)
    log(ifcDir, 'Input IFC folder opgeschoond')
  }
  if (!existsSync(ifcDir)) {
    await mkdir(ifcDir)
    log(ifcDir, 'Input IFC folder aangemaakt')
  }

  const ifcOutput = `${ifcDir}/${args.ifc}`

  let ifcAsset: Asset
  try {
    ifcAsset = await vcsDataset.getAsset(args.ifc)
  } catch (error) {
    throw new Error(`Kon het IFC asset niet vinden in TriplyDB`)
  }

  // write asset to input ifc directory
  await writeFile(ifcOutput, await ifcAsset.toStream(), 'utf8')

  const consoleUrl = (await triply.getInfo()).consoleUrl
  const userName = (await user.getInfo()).accountName
  const assetBaseUrl = `${consoleUrl}/_api/datasets/${userName}/vcs/assets/download?fileName=${args.ifc}`
  const inputIfc = import.meta.resolve(`../../../input/ifc/${args.ifc}`).replace('file://', '')
  const ifcIdentifier = crypto.createHash('md5').update(inputIfc).digest('hex')

  return {
    account,
    args,
    assetBaseUrl,
    baseIRI,
    datasetName,
    idsIdentifier,
    ifcIdentifier,
    inputIds,
    inputIfc,
    outputsDir,
    ruleIds,
  }
}
