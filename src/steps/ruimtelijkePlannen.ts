import fs from 'fs/promises'
import { Quad } from '@rdfjs/types'

import { graphExists } from '@root/helpers/existence.js'
import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { writeGraph, graphName } from '@root/helpers/writeGraph.js'
import { jsonldToQuads, responseToLinkedData } from '@root/requesters/responseToLinkedData.js'
import {
  ruimtelijkePlannenRequest,
  ruimtelijkePlannenURL,
  ApiArgs,
} from '@root/requesters/ruimtelijkePlannenRequest.js'
import { getBuildings } from '@root/sparql/getBuildings.js'
import { Context, Step } from '@root/types.js'
import { wktToGeoJSON } from '@terraformer/wkt'

export default {
  name: 'Ruimtelijke plannen',
  description: 'Bevraging & opslaan van data uit de Ruimtelijke Plannen API',
  run: async (context: Context) => {
    const namepath = ['externe-data', 'ruimtelijke-plannen']

    // if (context.cache && (await graphExists(context.buildingDataset, graphName))) {
    //   return SKIP_STEP
    // }

    // const quads: Quad[] = []
    const requestToQuads = async (title: string[], args: ApiArgs) => {
      const response = await ruimtelijkePlannenRequest(args)
      // TODO I think writing just one graph is better, but running into serialization issues
      // quads.push(...(await responseToLinkedData({ '@id': `${graphId}#${title}`, ...response }, ruimtelijkePlannenURL)))
      const graphId = graphName(context, namepath.concat(title))
      const quads = await responseToLinkedData({ '@id': graphId, ...response }, ruimtelijkePlannenURL)
      await writeGraph(context, quads, namepath.concat(title))
      return response
    }

    // Find all buildings and their footprints in the dataset and add all plans
    // relevant to those buildings as linked data
    for (const building of await getBuildings(context)) {
      const naam = building.root.split('/').pop() ?? 'building'
      const footprint = wktToGeoJSON(building.wkt.replace(/^<.*> /, '').toUpperCase())
      const response = await requestToQuads([naam, 'plannen'], {
        path: '/plannen/_zoek',
        body: { _geo: { contains: footprint } },
        params: { planType: 'bestemmingsplan' /* expand: 'geometrie' */ }, // TODO: This makes fetch crash
      })
      // quads.push(...(await jsonldToQuads({[building.root]: }))

      for (const plan of response['_embedded']['plannen']) {
        await requestToQuads([naam, `maatvoeringen-${plan.id}`], {
          path: `/plannen/${plan.id}/maatvoeringen/_zoek`,
          body: { _geo: { intersects: footprint } },
          params: { expand: 'geometrie' },
        })
        await requestToQuads([naam, `bouwaanduidingen-${plan.id}`], {
          path: `/plannen/${plan.id}/bouwaanduidingen/_zoek`,
          body: { _geo: { intersects: footprint } },
          params: { expand: 'geometrie' },
        })
        await requestToQuads([naam, `bestemmingsvlakken-${plan.id}`], {
          path: `/plannen/${plan.id}/bestemmingsvlakken/_zoek`,
          body: { _geo: { intersects: footprint } },
          params: { expand: 'geometrie' },
        })
      }
    }
  },
} satisfies Step
