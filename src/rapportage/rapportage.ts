import { writeFile } from 'fs/promises'
import { renderToStaticMarkup } from 'react-dom/server'

import { StepContext } from '@core/executeSteps.js'
import { createLogger } from '@helpers/logger.js'
import { rdfs, xsd } from '@helpers/namespaces.js'
import App from '@triply/triplydb'
import { Activity } from '@core/Activity.js'

import RapportageTemplate from './RapportageTemplate.js'
import factory from '@rdfjs/data-model'

const log = createLogger('rapport', import.meta)

export const rapport = new Activity(
  { name: 'VCS Rapport', description: 'Creatie en upload van VCS Rapport' },
  async (
    {
      account,
      assetBaseUrl,
      baseIRI,
      datasetName,
      elongation,
      footprintT1,
      gebouwAddress,
      gebouwSubject,
      idsControle,
      outputsDir,
      rpt,
      controle,
    }: Pick<
      StepContext,
      | 'account'
      | 'assetBaseUrl'
      | 'baseIRI'
      | 'datasetName'
      | 'elongation'
      | 'footprintT1'
      | 'gebouwAddress'
      | 'gebouwSubject'
      | 'idsControle'
      | 'outputsDir'
      | 'rpt'
      | 'controle'
    >,
    thisActivity: Activity<any, any>,
  ) => {
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const user = await triply.getAccount(account)
    const dataset = await user.getDataset(datasetName)

    if (!dataset) throw new Error(`Kon de dataset ${datasetName} niet vinden in TriplyDB`)

    // const gltfAsset = await dataset.getAsset('3Dgebouw.gltf')
    // const blob = await model.blob()
    // const buffer = Buffer.from(await blob.arrayBuffer())
    // const urlBase64Encoded = buffer.toString('base64url')
    log('Genereren van het VCS rapport', 'VCS rapport')

    const props = {
      datasetName,
      gebouwAddress,
      elongation,
      baseIRI,
      rpt,
      footprintUrl: `${gebouwSubject.toString()}/footprint`,
      gebouw: controle.pointer.out(rpt('building')).value.toString(),
      gltfDownload: `${assetBaseUrl}3Dgebouw.gltf`,
      glbDownload: `${assetBaseUrl}3Dgebouw.glb`,
      footprint: {
        type: 'Feature',
        geometry: footprintT1,
        properties: {
          name: 'Voetafdruk',
          show_on_map: true,
          popupContent: 'Voetafdruk van het gebouw',
          style: {
            weight: 2,
            color: '#999',
            opacity: 1,
            fillColor: '#009900',
            fillOpacity: 0.6,
          },
        },
      },
    }
    const provenance = thisActivity.provenanceGraph
    if (!provenance) throw new Error()
    const html = renderToStaticMarkup(RapportageTemplate(props, controle, provenance, idsControle))
    await writeFile(`${outputsDir}/vcs-rapport.html`, html)
    const fileId = `vcs-rapport.html`

    try {
      const existingAsset = await dataset.getAsset(fileId)
      await existingAsset.delete()
    } catch {}

    log('Upload VCS rapport', 'VCS rapport')
    await dataset.uploadAsset(`${outputsDir}/vcs-rapport.html`, fileId)
    log('Klaar met upload van het VCS rapport', 'VCS rapport')

    thisActivity.provenance?.addOut(rdfs('seeAlso'), factory.literal(`${assetBaseUrl}vcs-rapport.html`, xsd('anyURI')))

    log('Uploaden van het provenance log naar TriplyDB', 'Upload')
    await dataset.importFromStore(thisActivity.provenanceGraph as any, {
      defaultGraphName: `${baseIRI}graph/provenance`,
      overwriteAll: true,
    })
    return {}
  },
)
