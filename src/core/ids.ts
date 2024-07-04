import * as path from 'path'
import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'
import { StepContext } from './executeSteps.js'
import Provenance from './Provenance.js'

const executeCommand = createExecutor('idsControle', import.meta, 'idsControle')
const log = createLogger('idsControle', import.meta)

export const idsControle = async (context: StepContext): Promise<{}> => {
  context.provenance = new Provenance(`${context.baseIRI}${context.datasetName}`)
  const idsControle = context.provenance.activity({
    label: 'IDS controle',
    description: 'IDS controle door https://pypi.org/project/ifctester/',
  })
  const pythonScript = path.join('src', 'tools', 'validate_IFC.py')
  const idsReportHtml = path.join(context.outputsDir, 'IDSValidationReport.html')
  const idsReportBcf = path.join(context.outputsDir, 'IDSValidationReport.bcf')
  log('Uitvoeren van IDS controle', 'IDS controle')
  try {
    await executeCommand(
      `python3 ${pythonScript} "${context.inputIfc}" "${context.inputIds}" -r "${idsReportHtml}" -b "${idsReportBcf}"`,
    )
  } catch (e) {
    // Just continue if IDS control fails
    if (e instanceof Error) {
      if (!e.message.includes('validation failed')) throw e
      else log(e.message)
    } else {
      throw e
    }
  }
  context.provenance.addSeeAlso(idsControle, `${context.assetBaseUrl}IDSValidationReport.html`)
  context.provenance.addSeeAlso(idsControle, `${context.assetBaseUrl}IDSValidationReport.bcf`)
  context.provenance.done(idsControle)
  return {}
}
