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
      footprintT1,
      footprintT2,
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
      | 'footprintT1'
      | 'footprintT2'
      | 'elongation'
      | 'ifcAssetBaseUrl'
      | 'rpt'
    >,
    thisActivity: Activity<any, any>,
  ) => {
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const user = await triply.getAccount(account)
    const dataset = await user.getDataset(datasetName)

    const controle = (await Controle.instantiateFromDirectory()) as Controle<Partial<StepContext>, any>

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

    if (!thisActivity.provenance) throw new Error()
    await controle.runAll(
      { elongation, footprintT1, footprintT2, baseIRI, datasetName, rpt, account },
      thisActivity.provenance,
    )

    log('Uploaden van het validatie rapport naar TriplyDB', 'Upload')

    await dataset.importFromStore(report as any, {
      defaultGraphName: `${baseIRI}graph/controles`,
      overwriteAll: true,
    })

    log('Klaar met het uploaden van het validatie rapport naar TriplyDB', 'Upload')

    return { controle }
  },
)
