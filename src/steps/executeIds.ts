import * as path from 'path'

import { execWithProvenance } from '@root/provenance/execWithProvenance.js'
import { Context, Step } from '@root/types.js'

export default {
  weight: 0,
  name: 'IDS validatie',
  description: 'Valideer de gegeven .ifc tegen de .ids bestanden',
  async run(context: Context) {
    const { stdout: versionOutput } = await execWithProvenance('python3 --version')
    const version = versionOutput.trim().substring(7)

    const idsName = path.basename(context.idsFile!, '.ids').replace(/[^a-zA-Z]+/g, '')
    const idsReportHtml = path.join(context.outputsDir!, `IDSValidationReport_${idsName}.html`)
    const idsReportBcf = path.join(context.outputsDir!, `IDSValidationReport_${idsName}.bcf`)
    const validateScript = path.join('src', 'tools', 'validate_IFC.py')

    await execWithProvenance(
      `python3 ${validateScript} "${context.ifcFile}" "${context.idsFile!}" -r "${idsReportHtml}" -b "${idsReportBcf}"`,
    )
  },
} satisfies Step
