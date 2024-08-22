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
    let skip = false
    for (const building of await getBuildings(context)) {
      const graphPath = ['externe-data', building.name, 'ruimtelijke-plannen']
      const graphId = graphName(context, graphPath)

      if (context.cache && (await graphExists(context.buildingDataset, graphId))) {
        skip = true
        continue
      }

      const quads: Quad[] = []
      const requestToQuads = async (args: ApiArgs) => {
        const response = await ruimtelijkePlannenRequest(args)
        quads.push(
          ...(await responseToLinkedData(
            { '@id': `${graphId}#${args.path.replace(/^\//, '')}`, ...response },
            ruimtelijkePlannenURL,
          )),
        )
        return response
      }

      const footprint = wktToGeoJSON(building.wkt.replace(/^<.*> /, '').toUpperCase())
      const response = await requestToQuads({
        path: '/plannen/_zoek',
        body: { _geo: { contains: footprint } },
        params: { planType: 'bestemmingsplan' /* expand: 'geometrie' */ }, // TODO: This makes fetch crash
      })
      // quads.push(...(await jsonldToQuads({[building.root]: }))

      // Select the most recent parapluplan plus the most recent bestemmingsplan
      // that has a 'dossierstatus' of 'geldend', in accordance with
      // <https://git.triply.cc/customers/gemeenterotterdam/vergunningscontroleservice/-/issues/32>,
      const relevantPlans: any[] = response['_embedded']['plannen']
        .filter((plan: any) => !(plan.dossier?.status in ['in voorbereiding', 'vastgesteld', 'niet in werking']))
        .sort((a: any, b: any) => {
          const x = a['planstatusInfo']['datum']
          const y = b['planstatusInfo']['datum']
          if (x < y) return 1
          if (y < x) return -1
          return 0
        })
      const selectedPlans = relevantPlans
        .filter((p) => !p.isParapluplan)
        .slice(0, 1)
        .concat(relevantPlans.filter((p) => p.isParapluplan).slice(0, 1))

      console.log(
        'Selected plans:',
        selectedPlans.map((p: any) => p.id),
      )

      for (const plan of selectedPlans) {
        await requestToQuads({
          path: `/plannen/${plan.id}/maatvoeringen/_zoek`,
          body: { _geo: { intersects: footprint } },
          params: { expand: 'geometrie' },
        })
        await requestToQuads({
          path: `/plannen/${plan.id}/bouwaanduidingen/_zoek`,
          body: { _geo: { intersects: footprint } },
          params: { expand: 'geometrie' },
        })
        await requestToQuads({
          path: `/plannen/${plan.id}/bestemmingsvlakken/_zoek`,
          body: { _geo: { intersects: footprint } },
          params: { expand: 'geometrie' },
        })
      }
      await writeGraph(context, quads, graphPath)
    }

    if (skip) return SKIP_STEP
  },
} satisfies Step
