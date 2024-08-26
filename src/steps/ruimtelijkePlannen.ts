import fs from 'fs/promises'
import { Quad } from '@rdfjs/types'

import { graphExists } from '@root/helpers/existence.js'
import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { rdfs } from '@root/core/namespaces.js'
import { writeGraph, formatUri } from '@root/helpers/writeGraph.js'
import { projectGeoJSON, epsg28992 } from '@root/helpers/projectGeoJSON.js'
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
  strict: false,
  run: async (context: Context) => {
    const graphPath = ['graph', 'externe-data', 'ruimtelijke-plannen']
    const graphUri = formatUri(context.baseIRI, graphPath)

    // if (context.cache && (await graphExists(context.buildingDataset, graphUri))) return SKIP_STEP

    const quads: Quad[] = []
    for (const building of await getBuildings(context)) {
      const footprint = wktToGeoJSON(building.wkt.replace(/^<.*> /, '').toUpperCase())

      const requestToQuads = async (args: ApiArgs, extra?: (x: any) => any) => {
        const response = await ruimtelijkePlannenRequest(args)
        const instanceUri = `${graphUri}/${building.name}#${args.path.replace(/^\//, '').replaceAll(/\//g, '-')}`
        quads.push(
          ...(await responseToLinkedData(
            extra ? extra(response) : response,
            ruimtelijkePlannenURL,
            building.root,
            instanceUri,
          )),
        )
        return response
      }

      const response = await requestToQuads(
        {
          path: '/plannen/_zoek',
          body: { _geo: { contains: footprint } },
          params: { planType: 'bestemmingsplan' /* expand: 'geometrie' */ }, // TODO: This makes fetch crash
        },
        (response: any) => {
          const plannen = response['_embedded']['plannen']
          for (let i = 0; i < plannen.length; i++) {
            plannen[i]['@id'] = `${ruimtelijkePlannenURL}#${plannen[i]['id']}`
          }
          return response
        },
      )

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

      // TODO: This is a temporary test footprint, so that we can find a 'flat roof' indicator
      const footprintT1 = wktToGeoJSON(
        `POLYGON ((84165 431938, 84172 431938, 84172 431943, 84165 431943, 84165 431938))`,
      )

      for (const plan of selectedPlans) {
        const addSeeAlso = (x: any) => {
          return { ...x, [rdfs('seeAlso').value]: { '@id': `${ruimtelijkePlannenURL}#${plan.id}` } }
        }

        await requestToQuads(
          {
            path: `/plannen/${plan.id}/maatvoeringen/_zoek`,
            body: { _geo: { intersects: footprint } },
            params: { expand: 'geometrie' },
          },
          addSeeAlso,
        )
        await requestToQuads(
          {
            path: `/plannen/${plan.id}/bouwaanduidingen/_zoek`,
            body: { _geo: { intersects: footprintT1 } },
            params: { expand: 'geometrie' },
          },
          addSeeAlso,
        )
        await requestToQuads(
          {
            path: `/plannen/${plan.id}/bestemmingsvlakken/_zoek`,
            body: { _geo: { intersects: footprint } },
            params: { expand: 'geometrie' },
          },
          addSeeAlso,
        )
      }
    }
    await writeGraph(context, quads, graphPath)
  },
} satisfies Step
