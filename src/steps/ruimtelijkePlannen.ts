import fs from 'fs/promises'

import { graphExists } from '@root/helpers/existence.js'
import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { responseToLinkedData } from '@root/requesters/responseToLinkedData.js'
import { ruimtelijkePlannenRequest } from '@root/requesters/ruimtelijkePlannenRequest.js'
import { getBuildings } from '@root/sparql/getBuildings.js'
import { Context, Step } from '@root/types.js'
import { wktToGeoJSON } from '@terraformer/wkt'

export default {
  name: 'Ruimtelijke plannen',
  description: 'Bevraging & opslaan van data uit de Ruimtelijke Plannen API',
  run: async (context: Context) => {
    const graphName = `${context.baseIRI}graph/externe-data/ruimtelijke-plannen`

    // if (context.cache && (await graphExists(context.buildingDataset, graphName))) {
    //   return SKIP_STEP
    // }

    // Find all buildings and their footprints in the dataset and add all plans
    // relevant to those buildings as linked data
    for (const building of await getBuildings(context)) {
      const footprint = wktToGeoJSON(building.wkt.replace(/^<.*> /, '').toUpperCase())
      const response = await ruimtelijkePlannenRequest({
        path: '/plannen/_zoek',
        body: { _geo: { contains: footprint } },
        params: { planType: 'bestemmingsplan' /* expand: 'geometrie' */ }, // TODO: This makes fetch crash
      })

      const turtle = await responseToLinkedData(
        response,
        graphName + '/' + building.root.split('/').pop(),
        'https://ruimte.omgevingswet.overheid.nl#',
      )
      const filename = `${context.outputsDir}/ruimtelijke-plannen-${building.root.split('/').pop()}.ttl`
      await fs.writeFile(filename, turtle, 'utf8')
      await context.buildingDataset.importFromFiles([filename], {
        defaultGraphName: graphName + '/' + building.root.split('/').pop(),
        overwriteAll: true,
      })

      for (const plan of response['_embedded']['plannen']) {
        const responseMaatvoering = await ruimtelijkePlannenRequest({
          path: `/plannen/${plan.id}/maatvoeringen/_zoek`,
          body: { _geo: { intersects: footprint } },
          params: { expand: 'geometrie' },
        })

        const turtle = await responseToLinkedData(
          responseMaatvoering,
          graphName + '/' + plan.id,
          'https://ruimte.omgevingswet.overheid.nl#',
        )
        const filename = `${context.outputsDir}/ruimtelijke-plannen-plan-${plan.id}.ttl`
        await fs.writeFile(filename, turtle, 'utf8')
        await context.buildingDataset.importFromFiles([filename], {
          defaultGraphName: graphName + '/' + plan.id,
          overwriteAll: true,
        })
      }
    }
  },
} satisfies Step
