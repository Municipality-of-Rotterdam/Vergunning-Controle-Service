import chalk from 'chalk'
import grapoi from 'grapoi'
import { exec } from 'child_process'

import { StepContext } from '@core/executeSteps.js'
import { createLogger } from '@helpers/logger.js'
import { rdf, rdfs, rpt, xsd, prov, dct, skos, geo, sf } from '@helpers/namespaces.js'
import factory from '@rdfjs/data-model'
import App from '@triply/triplydb'
import { Store as TriplyStore } from '@triplydb/data-factory'
import { Activity } from './Activity.js'
import { start, finish } from './helpers/provenance.js'

import { headerLogBig } from './helpers/headerLog.js'

import type { GrapoiPointer } from '@helpers/grapoi.js'
import { geojsonToWKT } from '@terraformer/wkt'
const log = createLogger('checks', import.meta)

export const valideer = new Activity(
  { name: 'Controles uitvoeren' },
  async (
    {
      account,
      args,
      ifcAssetBaseUrl,
      baseIRI,
      checkGroups,
      datasetName,
      ruleIds,
      provenanceDataset,
    }: Pick<
      StepContext,
      | 'account'
      | 'args'
      | 'ifcAssetBaseUrl'
      | 'baseIRI'
      | 'checkGroups'
      | 'datasetName'
      | 'ruleIds'
      | 'provenanceDataset'
    >,
    provenancePointer: GrapoiPointer, // TODO: of course this one must be used but there's no time
  ) => {
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const user = await triply.getAccount(account)
    const dataset = await user.getDataset(datasetName)

    const report = new TriplyStore()
    const reportPointer: GrapoiPointer = grapoi({ dataset: report, factory, term: factory.blankNode() })

    reportPointer.addOut(rdf('type'), rpt('ValidateRapport'))
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

    for (const checkGroup of checkGroups) {
      const groupRuleIds = checkGroup.controles.map((controle) => controle.id)
      if (ruleIds.length && ruleIds.some((ruleId) => !groupRuleIds.includes(ruleId))) continue

      headerLogBig(`Groep: "${checkGroup.naam}": Uitvoering`, 'yellowBright')

      const data = checkGroup.data
      const bp: GrapoiPointer = grapoi({ dataset: report, factory, term: factory.blankNode() })
      if (data && 'bestemmingsplan' in data) {
        const bestemmingsplan: any = data.bestemmingsplan
        let url: string = bestemmingsplan['heeftOnderdelen'].filter((o: any) => o['type'] == 'toelichting')[0][
          'externeReferenties'
        ][0]
        bp.addOut(rdf('type'), rpt('Bestemmingsplan'))
        bp.addOut(rdfs('label'), bestemmingsplan.id)
        bp.addOut(skos('prefLabel'), bestemmingsplan.naam)
        bp.addOut(rdfs('seeAlso'), factory.literal(url, xsd('anyUri')))
      }

      for (const controle of checkGroup.controles) {
        let uitvoering: GrapoiPointer
        if (controle.activity) {
          uitvoering = start(controle.activity, { name: `Uitvoering ${controle.naam}` })
        } else {
          throw new Error('must have an activity at this point')
        }

        uitvoering.addOut(rpt('sparqlUrl'), factory.literal(controle.sparqlUrl, xsd('anyUri')))

        headerLogBig(`Controle: "${controle.naam}": Uitvoering`)

        let message: string
        let success: boolean
        const query = controle.sparql(controle.sparqlInputs)
        if (!query) {
          message = controle.berichtGeslaagd(controle.sparqlInputs)
          success = true
          log(message, controle.naam)
        } else if (controle.isToepasbaar(controle.sparqlInputs)) {
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
          success = result ? result.success ?? false : true
          message = success
            ? controle.berichtGeslaagd(controle.sparqlInputs)
            : controle.berichtGefaald(controle.sparqlInputs)

          if (result) {
            for (const [key, value] of Object.entries(result)) {
              message = message.replaceAll(`{?${key}}`, value as string)
            }
          }

          if (success) {
            log(chalk.greenBright(`✅ ${message}`), controle.naam)
          } else {
            log(chalk.redBright(`❌ ${message}`), controle.naam)
          }
        } else {
          message = 'Niet van toepassing'
          success = true
          log(message, controle.naam)
        }

        finish(uitvoering)

        if (controle.activity) finish(controle.activity)

        reportPointer.addOut(rpt('controle'), (c: GrapoiPointer) => {
          c.addOut(rdf('type'), rpt('Controle'))
          c.addOut(rdfs('label'), controle.naam)
          c.addOut(dct('description'), factory.literal(controle.tekst, 'nl'))
          c.addOut(rpt('verwijzing'), factory.literal(controle.verwijzing, 'nl'))
          c.addOut(rpt('passed'), factory.literal(success.toString(), xsd('boolean')))
          c.addOut(rpt('message'), factory.literal(message, rdf('HTML')))
          c.addOut(prov('wasGeneratedBy'), controle.activity?.term)
          c.addOut(dct('source'), bp)

          // If there is a geoJSON property on the controle data, we add it
          // TODO pending refactoring
          if (controle.sparqlInputs && controle.sparqlInputs.hasOwnProperty('geoJSON')) {
            /*@ts-ignore */
            const geoJSON = controle.sparqlInputs.geoJSON
            const wkt = geojsonToWKT(geoJSON)
            const footprintPtr: GrapoiPointer = grapoi({
              dataset: report,
              factory,
              term: factory.namedNode(
                `${baseIRI}${datasetName}/Controle${controle.naam.replaceAll(/\W/g, '')}Footprint`,
              ),
            })
            c.addOut(rpt('footprint'), footprintPtr)
            footprintPtr.addOut(geo('coordinateDimension'), factory.literal('2', xsd('integer')))
            footprintPtr.addOut(rdf('type'), sf(geoJSON.type))
            footprintPtr.addOut(
              geo('asWKT'),
              factory.literal(`<http://www.opengis.net/def/crs/EPSG/0/28992> ${wkt}`, geo('wktLiteral')),
            )
            //  (f: GrapoiPointer) => {
            // })
          }

          // TODO temporary solution for reporting information that doesn't come from SPARQL query
          //@ts-ignore
          const elongation = controle.sparqlInputs.elongation
          if (elongation) c.addOut(rpt('elongation'), factory.literal(elongation))
        })
      }

      if (checkGroup.activity) finish(checkGroup.activity)
    }

    log('Uploaden van het provenance log naar TriplyDB', 'Upload')
    await dataset.importFromStore(provenanceDataset as any, {
      defaultGraphName: `${baseIRI}graph/provenance-log`,
      overwriteAll: true,
    })

    log('Uploaden van het validatie rapport naar TriplyDB', 'Upload')

    await dataset.importFromStore(report as any, {
      defaultGraphName: `${baseIRI}graph/validatie-rapport`,
      overwriteAll: true,
    })

    log('Klaar met het uploaden van het validatie rapport naar TriplyDB', 'Upload')

    return { validation: report, validationPointer: reportPointer }
  },
)
