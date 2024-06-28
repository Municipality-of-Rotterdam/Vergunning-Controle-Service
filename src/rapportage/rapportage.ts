import { writeFile } from 'fs/promises'
import { renderToStaticMarkup } from 'react-dom/server'

import { StepContext } from '@core/executeSteps.js'
import { createLogger } from '@helpers/logger.js'
import { rdfs, rpt } from '@helpers/namespaces.js'
import App from '@triply/triplydb'

import RapportageTemplate from './RapportageTemplate.js'

const log = createLogger('rapportage', import.meta)

export const rapportage = async ({
  pointer,
  outputsDir,
  datasetName,
  account,
  voetprintCoordinates,
  geoData,
}: Pick<StepContext, 'pointer' | 'outputsDir' | 'datasetName' | 'account' | 'voetprintCoordinates' | 'geoData'>) => {
  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const user = await triply.getAccount(account)
  const dataset = await user.getDataset(datasetName)

  if (!dataset) throw new Error(`Kon de dataset ${datasetName} niet vinden in TriplyDB`)

  const gltfAsset = await dataset.getAsset('gebouw.gltf')
  const model = await fetch(gltfAsset.getInfo().url, {
    headers: {
      'content-type': 'application/json',
      Accepts: 'application/sparql-results+json, application/n-triples',
      Authorization: 'Bearer ' + process.env.TRIPLYDB_TOKEN!,
    },
  })
  const blob = await model.blob()
  const buffer = Buffer.from(await blob.arrayBuffer())
  const urlBase64Encoded = buffer.toString('base64url')

  log('Genereren van het vcs rapport', 'VCS rapport')

  const props = {
    gebouw: pointer.out(rpt('building')).value.toString(),
    geoData: geoData,
    gltfUrl: gltfAsset.getInfo().url,
    polygon: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [voetprintCoordinates],
      },
    },
    controles: pointer.out(rpt('controle')).map((controle) => {
      return {
        label: controle.out(rdfs('label')).value,
        validated: controle.out(rpt('passed')).value === 'true',
        message: controle.out(rpt('message')).value,
      }
    }),
  }

  const html = renderToStaticMarkup(RapportageTemplate(props))
  await writeFile(`${outputsDir}/vcs-rapport.html`, html)
  const fileId = `vcs-rapport.html`

  try {
    const existingAsset = await dataset.getAsset(fileId)
    await existingAsset.delete()
  } catch {}

  log('Upload vcs rapport', 'VCS rapport')
  await dataset.uploadAsset(`${outputsDir}/vcs-rapport.html`, fileId)
  log('Klaar met upload van het vcs rapport', 'VCS rapport')
}
