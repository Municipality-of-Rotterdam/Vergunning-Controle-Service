import { existsSync } from 'fs'

import { StepContext } from '@core/executeSteps.js'
import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'
import { ifc } from '@helpers/namespaces.js'
import { Quad_Subject } from '@rdfjs/types'
import App from '@triply/triplydb'

// import { addLinkedDataToStore } from './addLinkedDataToStore.js'

import type { GrapoiPointer } from '@helpers/grapoi.js'
const executeCommand = createExecutor('linked-data', import.meta, 'Linked Data')
const log = createLogger('linked-data', import.meta, 'Linked Data')

export const maakLinkedData = async ({
  outputsDir,
  inputIfc,
  baseIRI,
  account,
  datasetName,
  args,
}: Pick<StepContext, 'outputsDir' | 'inputIfc' | 'baseIRI' | 'account' | 'datasetName' | 'args'>) => {
  const storeCache = `${outputsDir}gebouw.ttl`
  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const user = await triply.getAccount(account)
  const dataset = await user.getDataset(datasetName)
  const { apiUrl } = await triply.getInfo()

  if (args.clean) {
    // TODO: ... of als de dataset nog niet bestaat
    if (args.clean || !existsSync(storeCache)) {
      log('Omvormen van de invoer .ifc naar Linked Data')

      try {
        await executeCommand(
          `java -jar "./src/tools/IFCtoLBD_CLI.jar" "${inputIfc}" --hasBuildingElements --hasBuildingElementProperties --ifcOWL -u="${baseIRI}" -t="${storeCache}"`,
          // TODO Check met Kathrin welke variant we moeten gebruiken.
          // `java -jar "./src/tools/IFCtoLBD_CLI.jar" "${inputIfc}" -be --hasGeolocation --hasGeometry --hasUnits --hasBuildingElementProperties --ifcOWL -l100 -u=${baseIRI}  -t="${resolvedOutputTurtle}"`
        )
      } catch (error) {
        log((error as Error).message)
      }
    } else {
      log(`${storeCache} gevonden, we maken gebruik van cache`, 'Linked Data')
    }

    log('Uploaden van Linked Data naar TriplyDB')
    await dataset.importFromFiles([storeCache, `${outputsDir}gebouw_ifcOWL.ttl`], {
      defaultGraphName: `${baseIRI}${datasetName}/graph/gebouw`,
      overwriteAll: true,
    })
  }

  // Determine the subject of the building

  const sparqlUrl = `${apiUrl}/datasets/${account ?? user.slug}/${datasetName}/sparql`
  const response = await fetch(sparqlUrl, {
    body: JSON.stringify({
      query: `SELECT ?subject WHERE { GRAPH <${baseIRI}${datasetName}/graph/gebouw> { ?subject a <${ifc('IfcBuilding').value}> } }`,
    }),
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Accepts: 'application/sparql-results+json, application/n-triples',
      Authorization: 'Bearer ' + process.env.TRIPLYDB_TOKEN!,
    },
  }).then((response) => response.json())
  const gebouwSubject = response.length == 1 ? response[0]['subject'] : null
  if (!gebouwSubject)
    throw new Error(`Kon het subject van het gebouw niet vinden; response was ${JSON.stringify(response)}`)

  return { dataset, gebouwSubject: gebouwSubject as Quad_Subject }
}
