import fs from 'fs/promises'

import { StepContext } from '@core/executeSteps.js'
import { createLogger } from '@helpers/logger.js'
import App from '@triply/triplydb'
import { Activity } from './Activity.js'
import { GrapoiPointer } from './helpers/grapoi.js'
import { rdfs } from './helpers/namespaces.js'
import factory from '@rdfjs/data-model'

const log = createLogger('upload', import.meta, 'Upload')

export const upload = new Activity(
  { name: 'Upload' },
  async (
    {
      outputsDir,
      datasetName,
      args,
      baseIRI,
      account,
      verrijkingenDataset,
    }: Pick<StepContext, 'outputsDir' | 'args' | 'datasetName' | 'account' | 'baseIRI' | 'verrijkingenDataset'>,
    provenance: GrapoiPointer,
  ) => {
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const user = await triply.getAccount(account)
    const dataset = await user.getDataset(datasetName)

    const files = await fs.readdir(outputsDir)

    for (const file of files) {
      // We do not want to upload linked data as assets. Also the footprint.txt is added as linked data
      const extensions = ['.trig', '.ttl', '.txt']
      if (extensions.some((ext) => file.endsWith(ext))) continue

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

    provenance.addOut(rdfs('seeAlso'), factory.namedNode(`${baseIRI}assets`))

    // TODO: move to verrijkingen.ts

    const { apiUrl } = await triply.getInfo()

    let shouldUpload = true

    if (!args.clean) {
      const response = await fetch(`${apiUrl}/datasets/${account ?? user.slug}/${datasetName}/sparql`, {
        body: JSON.stringify({
          query: `ASK WHERE { GRAPH <${baseIRI}graph/gebouw> { ?s ?p ?o } }`,
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

    if (shouldUpload || true) {
      log(`Graph verrijkingen naar TriplyDB`)

      await dataset.importFromStore(verrijkingenDataset as any, {
        defaultGraphName: `${baseIRI}graph/verrijkingen`,
        overwriteAll: true,
      })

      log(`Klaar met uploaden naar TriplyDB`)
    } else {
    }
  },
)
