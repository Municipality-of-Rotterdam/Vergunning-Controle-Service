import * as path from 'path'

import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { execWithProvenance } from '@root/provenance/execWithProvenance.js'
import { Context, Step } from '@root/types.js'
import { graphExists } from '@root/helpers/existence.js'

export default {
  name: 'Linked Building Data',
  description: 'Converteert de .ifc naar Linked Data',
  strict: true,
  async run(context: Context) {
    const graph = `${context.baseIRI}graph/gebouw`

    if (context.cache && (await graphExists(context.buildingDataset, graph))) return SKIP_STEP

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
        defaultGraphName: graph,
        overwriteAll: true,
      },
    )
  },
} satisfies Step
