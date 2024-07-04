import { readdir } from 'fs/promises'
import * as path from 'path'
import { StepContext } from '@core/executeSteps.js'
import { Store as TriplyStore } from '@triplydb/data-factory'
import { GeoData } from '@verrijkingen/geoReference.js'
import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'

const executeCommand = createExecutor('idsValidatie', import.meta, 'idsValidatie')
const log = createLogger('idsValidatie', import.meta)

export const idsValidatie = async ({ inputIfc, inputIds, outputsDir }: StepContext): Promise<{}> => {
  const pythonScript = path.join('src', 'tools', 'validate_IFC.py')
  const idsReportHtml = path.join(outputsDir, 'IDSValidationReport.html')
  const idsReportBcf = path.join(outputsDir, 'IDSValidationReport.bcf')
  log('Uitvoeren van IDS validatie', 'IDS validate')
  try {
    await executeCommand(
      `python3 ${pythonScript} "${inputIfc}" "${inputIds}" -r "${idsReportHtml}" -b "${idsReportBcf}"`,
    )
  } catch (e) {
    // Just continue if IDS validation fails
    if (e instanceof Error) {
      if (!e.message.includes('validation failed')) throw e
      else log(e.message)
    } else {
      throw e
    }
  }
  return {}
}
