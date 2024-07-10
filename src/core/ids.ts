import * as path from 'path'
import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'
import { StepContext } from './executeSteps.js'
import { GrapoiPointer } from '@core/helpers/grapoi.js'
import { Activity } from './Activity.js'

import factory from '@rdfjs/data-model'
import { xsd, rdfs } from '@helpers/namespaces.js'

const executeCommand = createExecutor('idsControle', import.meta, 'idsControle')
const log = createLogger('idsControle', import.meta)

export const idsControle = new Activity(
  { name: 'IDS controle', description: 'IDS controle door https://pypi.org/project/ifctester/' },
  async (context: StepContext, provenance: GrapoiPointer) => {
    const pythonScript = path.join('src', 'tools', 'validate_IFC.py')
    const idsReportHtml = path.join(context.outputsDir, 'IDSValidationReport.html')
    const idsReportBcf = path.join(context.outputsDir, 'IDSValidationReport.bcf')
    log('Uitvoeren van IDS controle', 'IDS controle')
    try {
      await executeCommand(
        `python3 ${pythonScript} "${context.inputIfc}" "${context.inputIds}" -r "${idsReportHtml}" -b "${idsReportBcf}"`,
      )
    } catch (e) {
      // Just continue if IDS check fails
      if (e instanceof Error) {
        if (!e.message.includes('validation failed')) throw e
        else log(e.message)
      } else {
        throw e
      }
    }
    provenance.addOut(
      rdfs('seeAlso'),
      factory.literal(`${context.assetBaseUrl}IDSValidationReport.html`, xsd('anyURI')),
    )
    provenance.addOut(rdfs('seeAlso'), factory.literal(`${context.assetBaseUrl}IDSValidationReport.bcf`, xsd('anyURI')))
    return { idsControle: provenance }
  },
)
