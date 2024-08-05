import * as path from 'path'

import { GrapoiPointer } from '@core/helpers/grapoi.js'
import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'
import { rdfs, xsd } from '@helpers/namespaces.js'
import factory from '@rdfjs/data-model'

import { Activity } from './Activity.js'
import { StepContext } from './executeSteps.js'

const executeCommand = createExecutor('idsControle', import.meta, 'idsControle')
const log = createLogger('idsControle', import.meta)

export const idsControle = new Activity(
  { name: 'IDS Controle', description: 'IDS controle door https://pypi.org/project/ifctester/' },
  async (context: StepContext, thisActivity: Activity<any, any>) => {
    const idsName = context.inputIds.replaceAll('.ids', '').replace(/[^a-zA-Z]+/g, '')
    const htmlFileName = `IDSValidationReport_${idsName}.html`
    const bcfFileName = `IDSValidationReport_${idsName}.bcf`

    const pythonScript = path.join('src', 'tools', 'validate_IFC.py')
    const idsReportHtml = path.join(context.outputsDir, htmlFileName)
    const idsReportBcf = path.join(context.outputsDir, bcfFileName)
    log('Uitvoeren van IDS controle', 'IDS Controle')
    try {
      log('context.inputIfc', context.inputIfc)
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
    thisActivity.provenance?.addOut(
      rdfs('seeAlso'),
      factory.literal(`${context.assetBaseUrl}${htmlFileName}`, xsd('anyURI')),
    )
    thisActivity.provenance?.addOut(
      rdfs('seeAlso'),
      factory.literal(`${context.assetBaseUrl}${bcfFileName}`, xsd('anyURI')),
    )
    return { idsControle: thisActivity.provenance } // TODO this seems worng
  },
)
