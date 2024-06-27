import chalk from 'chalk'
import grapoi from 'grapoi'

import { StepContext } from '@core/executeSteps.js'
import { createLogger } from '@helpers/logger.js'
import { rdf, rdfs, rpt, xsd } from '@helpers/namespaces.js'
import factory from '@rdfjs/data-model'
import App from '@triply/triplydb'
import { Store as TriplyStore } from '@triplydb/data-factory'

import { headerLogBig } from './helpers/headerLog.js'

import type { GrapoiPointer } from '@helpers/grapoi.js'
const log = createLogger('checks', import.meta)

export const valideer = async ({
  inputIfc,
  checkGroups,
  datasetName,
  account,
  baseIRI,
  ruleIds,
}: Pick<StepContext, 'inputIfc' | 'checkGroups' | 'datasetName' | 'account' | 'baseIRI' | 'ruleIds'>) => {
  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const user = await triply.getAccount(account)
  const dataset = await user.getDataset(datasetName)

  const report = new TriplyStore()
  const reportPointer: GrapoiPointer = grapoi({ dataset: report, factory, term: factory.blankNode() })

  reportPointer.addOut(rdf('type'), rpt('ValidateRapport'))
  reportPointer.addOut(rpt('building'), factory.namedNode(`${baseIRI}${datasetName}/gebouw`))
  reportPointer.addOut(rpt('ifc'), factory.literal(inputIfc))

  const { apiUrl } = await triply.getInfo()

  for (const checkGroup of checkGroups) {
    const groupRuleIds = checkGroup.controles.map((controle) => controle.id)
    if (ruleIds.length && ruleIds.some((ruleId) => !groupRuleIds.includes(ruleId))) continue

    headerLogBig(`Groep: "${checkGroup.naam}": Uitvoering`, 'yellowBright')

    for (const controle of checkGroup.controles) {
      const name = controle.naam
      const query = controle.sparql(controle.sparqlInputs)
      headerLogBig(`Controle: "${name}": Uitvoering`)

      log(`Bevragen van de SPARQL service`, name)

      const response = await fetch(`${apiUrl}/datasets/${account ?? user.slug}/${datasetName}/sparql`, {
        body: JSON.stringify({ query }),
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Accepts: 'application/sparql-results+json, application/n-triples',
          Authorization: 'Bearer ' + process.env.TRIPLYDB_TOKEN!,
        },
      })
      if (!response.ok) {
        throw new Error(response.statusText)
      }
      const responseJson = await response.json()
      const result = responseJson[0] ?? null
      const success: boolean = result ? result.success : false
      let message = success
        ? controle.berichtGeslaagd(controle.sparqlInputs)
        : controle.berichtGefaald(controle.sparqlInputs)

      if (result) {
        for (const [key, value] of Object.entries(result)) {
          message = message.replaceAll(`{?${key}}`, value as string)
        }
      }

      if (success) {
        log(chalk.greenBright(`✅ ${message}`), name)
      } else {
        log(chalk.redBright(`❌ ${message}`), name)
      }

      reportPointer.addOut(rpt('controle'), (controle: GrapoiPointer) => {
        controle.addOut(rdf('type'), rpt('Controle'))
        controle.addOut(rdfs('label'), factory.literal(name))
        controle.addOut(rpt('passed'), factory.literal((!!!success).toString(), xsd('boolean')))
        controle.addOut(rpt('message'), factory.literal(message))
      })
    }
  }

  log('Uploaden van het validatie rapport naar TriplyDB', 'Upload')

  await dataset.importFromStore(report as any, {
    defaultGraphName: `${baseIRI}${datasetName}/validatie-rapport`,
    overwriteAll: true,
  })

  log('Klaar met het uploaden van het validatie rapport naar TriplyDB', 'Upload')

  return { report, pointer: reportPointer }
}
