import path from 'path'

import { graphExists } from '@root/helpers/existence.js'
import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { execWithProvenance } from '@root/provenance/execWithProvenance.js'
import { Context, Step } from '@root/types.js'

export default {
  name: 'Voetafdrukken berekenen',
  description: '',
  run: async (context: Context) => {
    const footprintGraph = `${context.baseIRI}graph/voetafdruk`

    if (context.cache && (await graphExists(context.buildingDataset, footprintGraph))) {
      return SKIP_STEP
    }

    const footprintExtractPath = path.join('tools', 'footprint.py')
    const turtlePath = path.join(context.outputsDir!, `footprint.ttl`)
    await execWithProvenance('python3 --version')
    await execWithProvenance('python3 -m pip install -r ./tools/requirements.txt --quiet')
    const command = `python3 ${footprintExtractPath} "${context.ifcFile}" -u="${context.baseIRI}" IfcRoof,IfcSlab > ${turtlePath}`
    await execWithProvenance(command)

    await context.buildingDataset.importFromFiles([turtlePath], {
      defaultGraphName: footprintGraph,
      overwriteAll: true,
    })
  },
} satisfies Step
