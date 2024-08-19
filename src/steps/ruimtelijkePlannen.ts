import fs from 'fs/promises';

import { graphExists } from '@root/helpers/existence.js';
import { SKIP_STEP } from '@root/helpers/skipStep.js';
import { responseToLinkedData } from '@root/requesters/responseToLinkedData.js';
import { ruimtelijkePlannenRequest } from '@root/requesters/ruimtelijkePlannenRequest.js';
import { getBuildings } from '@root/sparql/getBuildings.js';
import { Context, Step } from '@root/types.js';
import { wktToGeoJSON } from '@terraformer/wkt';

export default {
  name: 'Ruimtelijke plannen',
  description: 'Bevraging & opslaan van data uit de Ruimtelijke Plannen API',
  run: async (context: Context) => {
    const graphName = `${context.baseIRI}graphs/externe-data/ruimtelijke-plannen`

    if (context.cache && (await graphExists(context.buildingDataset, graphName))) {
      // return SKIP_STEP
    }

    // Find all buildings and their footprints in the dataset
    const buildings: any[] = await getBuildings(context)
    console.log(buildings.length, 'gebouwen gevonden')

    const files: string[] = []
    // Add all plans relevant to those buildings as linked data
    for (const building of buildings) {
      const footprint = wktToGeoJSON(building.footprint.replace(/^<.*> /, '').toUpperCase())
      const response = await ruimtelijkePlannenRequest({
        path: '/plannen/_zoek',
        body: { _geo: { contains: footprint } },
        params: { planType: 'bestemmingsplan', expand: 'geometrie' }, // TODO: This makes fetch crash
      })

      const turtle = await responseToLinkedData(response, graphName + '/' + building.node.split('/').pop())
      const filename = `${context.outputsDir}/ruimtelijke-plannen.ttl`
      fs.writeFile(filename, turtle, 'utf8')
      files.push(filename)

      for (const plan of response['_embedded']['plannen']) {
        const responseMaatvoering = await ruimtelijkePlannenRequest({
          path: `/plannen/${plan.id}/maatvoeringen/_zoek`,
          body: { _geo: { intersects: footprint } },
          params: { expand: 'geometrie' },
        })

        const turtle = await responseToLinkedData(responseMaatvoering, graphName + '/' + plan.id)
        const filename = `${context.outputsDir}/ruimtelijke-plannen-plan-${plan.id}.ttl`
        fs.writeFile(filename, turtle, 'utf8')
        files.push(filename)
      }
    }

    await context.buildingDataset.importFromFiles(files, {
      defaultGraphName: graphName,
      overwriteAll: true,
    })
  },
} satisfies Step
