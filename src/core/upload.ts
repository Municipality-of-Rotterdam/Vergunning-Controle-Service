import fs from 'fs/promises'

import { StepContext } from '@core/executeSteps.js'
import { createLogger } from '@helpers/logger.js'
import App from '@triply/triplydb'

const log = createLogger('upload', import.meta, 'Upload')

const fileUploadBlackList = [
  'building.glb',
  'data_ifcOWL.ttl',
  'data.ttl',
  'data.trig',
  'gebouw.ttl',
  'footprint.txt',
  'model.ttl',
  'shacl-report.ttl',
]

export const upload = async ({
  outputsDir,
  focusedDataset,
  datasetName,
  args,
  baseIRI,
  account,
  verrijkingenDataset,
}: Pick<
  StepContext,
  'outputsDir' | 'focusedDataset' | 'args' | 'datasetName' | 'account' | 'baseIRI' | 'verrijkingenDataset'
>) => {
  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const user = await triply.getAccount(account)
  const dataset = await user.getDataset(datasetName)

  const files = await fs.readdir(outputsDir)

  for (const file of files) {
    if (fileUploadBlackList.includes(file)) continue

    const fileId = file

    if (args.clean) {
      try {
        const existingAsset = await dataset.getAsset(fileId)
        await existingAsset.delete()
      } catch {}
      log(`Uploaden van ${fileId}`)
      await dataset.uploadAsset(`./outputs/${datasetName}/${file}`, fileId)
      log(`Klaar met uploaden van ${fileId}`)
    } else {
      try {
        await dataset.getAsset(fileId)
        log(`Bestand ${fileId} gevonden`)
      } catch {
        log(`Uploaden van ${fileId}`)
        await dataset.uploadAsset(`./outputs/${datasetName}/${file}`, fileId)
        log(`Klaar met uploaden van ${fileId}`)
      }
    }
  }

  const { apiUrl } = await triply.getInfo()

  let shouldUpload = true

  if (!args.clean) {
    const response = await fetch(`${apiUrl}/datasets/${account ?? user.slug}/${datasetName}/sparql`, {
      body: JSON.stringify({
        query: `ASK WHERE { GRAPH <${baseIRI}${datasetName}/gebouw> { ?s ?p ?o } }`,
      }),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Accepts: 'application/sparql-results+json, application/n-triples',
        Authorization: 'Bearer ' + process.env.TRIPLYDB_TOKEN!,
      },
    }).then((response) => response.json())

    const graphExists = response.boolean

    if (graphExists) shouldUpload = false
  }

  if (shouldUpload) {
    log(`Dataset uploaden naar TriplyDB`)

    await dataset.importFromStore(focusedDataset as any, {
      defaultGraphName: `https://www.rotterdam.nl/vcs/${datasetName}/gebouw`,
      overwriteAll: true,
    })

    await dataset.importFromStore(verrijkingenDataset as any, {
      defaultGraphName: `https://www.rotterdam.nl/vcs/${datasetName}/verrijkingen`,
      overwriteAll: true,
    })

    log(`Klaar met uploaden naar TriplyDB`)
  } else {
    log(`Dataset upload overgeslagen`)
  }
}
