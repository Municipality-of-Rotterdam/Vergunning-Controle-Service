import { existsSync } from 'fs'
import * as path from 'path'

import { fetchAssetByName } from '@root/helpers/fetchAssetByName.js'
import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { execWithProvenance } from '@root/provenance/execWithProvenance.js'
import { Context, Step } from '@root/types.js'

export default {
  name: 'IDS validatie',
  description: 'Valideer de gegeven .ifc tegen de .ids bestanden',
  async run(context: Context) {
    const idsName = path.basename(context.idsFile!, '.ids').replace(/[^a-zA-Z]+/g, '')
    const idsReportHtml = path.join(context.outputsDir!, `IDSValidationReport_${idsName}.html`)
    const idsReportBcf = path.join(context.outputsDir!, `IDSValidationReport_${idsName}.bcf`)

    if (context.cache && existsSync(idsReportHtml)) {
      return SKIP_STEP
    }

    await fetchAssetByName(context.idsFile.split('/').pop()!, context.inputsDir, context.cache)
    await execWithProvenance('python3 --version')
    const validateScript = path.join('tools', 'validate_IFC.py')

    const command = `python3 ${validateScript} "${context.ifcFile}" "${context.idsFile!}" -r "${idsReportHtml}" -b "${idsReportBcf}"`
    await execWithProvenance(command)
  },
} satisfies Step
