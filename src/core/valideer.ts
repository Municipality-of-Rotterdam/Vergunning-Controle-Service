import chalk from 'chalk'
import grapoi from 'grapoi'
import { exec } from 'child_process'

import { StepContext } from '@core/executeSteps.js'
import { createLogger } from '@helpers/logger.js'
import { rdf, rdfs, xsd, prov, dct, skos, geo, sf } from '@helpers/namespaces.js'
import factory from '@rdfjs/data-model'
import { Store as TriplyStore } from '@triplydb/data-factory'
import { Activity } from './Activity.js'
import { start, finish } from './helpers/provenance.js'
import { Controle } from './Controle.js'

import { headerLogBig } from './helpers/headerLog.js'

import type { GrapoiPointer } from '@helpers/grapoi.js'
import { Polygon } from 'geojson'
import { geojsonToWKT } from '@terraformer/wkt'
import App from '@triply/triplydb'
const log = createLogger('checks', import.meta)

export const valideer = new Activity(
  { name: 'Controles uitvoeren' },
  async (
    {
      account,
      args,
      baseIRI,
      datasetName,
      footprint,
      elongation,
      ifcAssetBaseUrl,
      rpt,
      ruleIds,
    }: Pick<
      StepContext,
      | 'account'
      | 'args'
      | 'ifcAssetBaseUrl'
      | 'baseIRI'
      | 'datasetName'
      | 'ruleIds'
      | 'footprint'
      | 'elongation'
      | 'ifcAssetBaseUrl'
      | 'rpt'
    >,
    thisActivity: Activity<any, any>,
  ) => {
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const user = await triply.getAccount(account)
    const dataset = await user.getDataset(datasetName)

    const controle = (await Controle.instantiateFromDirectory()) as Controle<
      { footprint: Polygon; elongation: number; baseIRI: string },
      any
    >

    const report = controle.graph
    const reportPointer = controle.pointer

    reportPointer.addOut(rdf('type'), rpt('Controle'))
    reportPointer.addOut(rpt('building'), factory.literal(`${baseIRI}${datasetName}/3Dgebouw`, xsd('anyURI')))

    // In the CI, git is not found --- somehow even when it is added to the Dockerfile
    if (process.env['CI_COMMIT_SHA']) {
      reportPointer.addOut(rpt('gitRevision'), process.env['CI_COMMIT_SHA'])
    } else {
      exec('git rev-parse HEAD', (error, stdout, _) => {
        reportPointer.addOut(rpt('gitRevision'), stdout)
        if (error) throw error
      })
    }
    reportPointer.addOut(rpt('ifc'), factory.literal(`${ifcAssetBaseUrl}${args.ifc}`, xsd('anyURI')))

    const { apiUrl } = await triply.getInfo()

    if (!thisActivity.provenance) throw new Error()
    await controle.run({ footprint, elongation, baseIRI }, thisActivity.provenance)

    for (const checkGroup of controle.constituents) {
      // const groupRuleIds = group.controles.map((controle) => controle.id)
      // if (ruleIds.length && ruleIds.some((ruleId: number) => !groupRuleIds.includes(ruleId))) continue
      // const groupRuleIds = checkGroup.controles.map((controle) => controle.id)
      // if (ruleIds.length && ruleIds.some((ruleId) => !groupRuleIds.includes(ruleId))) continue

      headerLogBig(`Groep: "${checkGroup.name}": Uitvoering`, 'yellowBright')

      for (const controle of checkGroup.constituents) {
        let uitvoering: GrapoiPointer
        if (controle.activity) {
          uitvoering = start(controle.activity, { name: `Uitvoering ${controle.name}` })
        } else {
          throw new Error('must have an activity at this point')
        }

        if (controle.sparqlUrl) uitvoering.addOut(rpt('sparqlUrl'), factory.literal(controle.sparqlUrl, xsd('anyUri')))

        headerLogBig(`Controle: "${controle.name}": Uitvoering`)

        const { success, message } = await controle.uitvoering(
          controle.data,
          `${apiUrl}/datasets/${account ?? user.slug}/${datasetName}/sparql`,
        )

        if (success == null) {
          log(message, controle.name)
        } else if (success) {
          log(chalk.greenBright(`✅ ${message}`), controle.name)
        } else {
          log(chalk.redBright(`❌ ${message}`), controle.name)
        }

        finish(uitvoering)

        if (controle.activity) finish(controle.activity)

        reportPointer.addOut(rpt('controle'), (c: GrapoiPointer) => {
          c.addOut(rdf('type'), rpt('Controle'))
          c.addOut(rdfs('label'), controle.name)
          if (controle.tekst) c.addOut(dct('description'), factory.literal(controle.tekst, 'nl'))
          if (controle.verwijzing) c.addOut(rpt('verwijzing'), factory.literal(controle.verwijzing, 'nl'))
          c.addOut(rpt('passed'), factory.literal((success == null ? true : success).toString(), xsd('boolean')))
          c.addOut(rpt('message'), factory.literal(message, rdf('HTML')))
          c.addOut(prov('wasGeneratedBy'), controle.activity?.term)
        })
      }

      // TODO return
      if (checkGroup.activity) finish(checkGroup.activity)
    }

    log('Uploaden van het validatie rapport naar TriplyDB', 'Upload')

    await dataset.importFromStore(report as any, {
      defaultGraphName: `${baseIRI}graph/controles`,
      overwriteAll: true,
    })

    log('Klaar met het uploaden van het validatie rapport naar TriplyDB', 'Upload')

    return { controle }
  },
)
