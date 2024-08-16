import n3 from 'n3'
import jsonld from 'jsonld'

import { graphExists } from '@root/helpers/existence.js'
import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { Context, Step } from '@root/types.js'
import { sparqlRequest } from '@root/helpers/sparqlRequest.js'
import { ifc, geo, sf, prov, rdf } from '@root/helpers/namespaces.js'
import { geojsonToWKT, wktToGeoJSON } from '@terraformer/wkt'
import { ruimtelijkePlannen } from '@root/helpers/api.js'
import { Quad } from '@rdfjs/types'

export default {
  name: 'Ruimtelijke plannen',
  description: 'Bevraging & opslaan van data uit de Ruimtelijke Plannen API',
  run: async (context: Context) => {
    const graphName = `${context.baseIRI}graph/externe-data-ruimtelijke-plannen`

    // if (context.cache && (await graphExists(context.buildingDataset, graph))) {
    //   return SKIP_STEP
    // }

    // Find all buildings and their footprints in the dataset
    const buildings: any[] = await sparqlRequest(
      context.datasetName,
      `SELECT ?node ?footprint WHERE {
        ?node a <${ifc('IfcBuilding').value}>.
        ?node <${geo('hasDefaultGeometry').value}> ?geom.
        ?geom <${geo('asWKT').value}> ?footprint.
      }`,
    )

    const store = new n3.Store()

    // Add all plans relevant to those buildings as linked data
    for (const building of buildings) {
      const footprint = wktToGeoJSON(building.footprint.replace(/^<.*> /, '').toUpperCase())
      const response = await ruimtelijkePlannen({
        path: '/plannen/_zoek',
        body: { _geo: { contains: footprint } },
        params: { planType: 'bestemmingsplan', expand: 'geometrie' },
      })

      const plannen = response['_embedded']['plannen']
      const doc: jsonld.JsonLdDocument = {
        '@context': {
          '@vocab': `${ruimtelijkePlannen.url}#`,
        },
        '@id': building.node,
        ruimtelijkPlan: plannen,
      }

      const quads = (await jsonld.toRDF(doc)) as Quad[]
      store.addQuads(quads)
    }
    await context.buildingDataset.importFromStore(store, {
      defaultGraphName: graphName,
      overwriteAll: true,
    })
  },
} satisfies Step
