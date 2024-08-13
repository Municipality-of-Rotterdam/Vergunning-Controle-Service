import * as path from 'path'

import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { execWithProvenance } from '@root/provenance/execWithProvenance.js'
import { Context, Step } from '@root/types.js'

export default {
  name: 'Linked Building Data',
  description: 'Converteert de .ifc naar Linked Data',
  async run(context: Context) {
    if (context.cache) {
      const endpoint = `${context.buildingDataset.api.url}/sparql?query=${encodeURIComponent(`select * where { ?s ?p ?o } limit 1`)}`
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.TRIPLYDB_TOKEN}`,
        },
      })

      const result = await response.json()
      if (response.status === 200 && result.length) return SKIP_STEP
    }

    await execWithProvenance('java --version')

    const outputFile = path.join(context.outputsDir, 'building.ttl')
    const command = `java -Xms2g -Xmx8g -jar "./tools/IFCtoLBD_CLI.jar" "${context.ifcFile}" --hasBuildingElements --hasBuildingElementProperties --hasSeparateBuildingElementsModel --hasSeparatePropertiesModel --ifcOWL -u="${context.baseIRI}" -t="${outputFile}"`
    await execWithProvenance(command)

    await context.buildingDataset.importFromFiles(
      [
        path.join(context.outputsDir, 'building.ttl'),
        path.join(context.outputsDir, 'building_building_elements.ttl'),
        path.join(context.outputsDir, 'building_element_properties.ttl'),
        path.join(context.outputsDir, 'building_ifcOWL.ttl'),
      ],
      {
        defaultGraphName: `${context.baseIRI}graph/gebouw`,
        overwriteAll: true,
      },
    )
  },
} satisfies Step
