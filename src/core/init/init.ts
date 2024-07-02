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
import App from '@triply/triplydb'
import Dataset from '@triply/triplydb/Dataset.js'
import { environments, Etl } from '@triplyetl/etl/generic'

const log = createLogger('init', import.meta)

export const baseIRI = 'https://demo.triplydb.com/rotterdam/'

export const init = async () => {
  dotenv.config()

  for (const variable of ['TRIPLYDB_TOKEN', 'RP_API_TOKEN'])
    if (!process.env[variable]) throw new Error(`Missing variable ${variable}`)

  const args = argsParser(process.argv)

  const datasetName = args.ifc.replaceAll('.ifc', '').replace(/[^a-zA-Z]+/g, '')
  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const account = Etl.environment === environments.Development ? undefined : 'rotterdam'
  const user = await triply.getAccount(account)

  let dataset: Dataset

  try {
    dataset = await user.getDataset(datasetName)
  } catch (error) {
    dataset = await user.addDataset(datasetName)
  }

  if (!dataset) throw new Error(`Kon de dataset ${datasetName} niet aanmaken in TriplyDB`)

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
  const inputIfc = import.meta.resolve(`../../../input/${args.ifc}`).replace('file://', '')
  const ifcIdentifier = crypto.createHash('md5').update(inputIfc).digest('hex')

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

  return {
    baseIRI,
    account,
    datasetName,
    ruleIds,
    outputsDir,
    inputIfc,
    ifcIdentifier,
    inputIds,
    idsIdentifier,
    args,
  }
}
