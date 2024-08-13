import path from 'path'
import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { execWithProvenance } from '@root/provenance/execWithProvenance.js'
import { Context, Step } from '@root/types.js'

export default {
  name: 'Voetafdrukken berekenen',
  description: '',
  run: async (context: Context) => {
    const footprintExtractPath = path.join('src', 'tools', 'footprint.py')
    const turtlePath = path.join(context.outputsDir!, `footprint.ttl`)
    const command = `python3 ${footprintExtractPath} "${context.ifcFile}" -u="${context.baseIRI}" IfcRoof,IfcSlab > ${turtlePath}`
    await execWithProvenance(command)
  },
} satisfies Step
