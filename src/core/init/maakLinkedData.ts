import { existsSync } from 'fs'

import { StepContext } from '@core/executeSteps.js'
import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'
import { ifc } from '@helpers/namespaces.js'
import { Quad_Subject } from '@rdfjs/types'
import App from '@triply/triplydb'

import type { GrapoiPointer } from '@helpers/grapoi.js'
const executeCommand = createExecutor('linked-data', import.meta, 'Linked data')
const log = createLogger('linked-data', import.meta, 'Linked data')

export const maakLinkedData = async ({
  account,
  args,
  baseIRI,
  consoleUrl,
  datasetName,
  inputIfc,
  outputsDir,
  provenance,
}: Pick<
  StepContext,
  'account' | 'args' | 'baseIRI' | 'consoleUrl' | 'datasetName' | 'inputIfc' | 'outputsDir' | 'provenance'
>) => {
  const storeCache = `${outputsDir}gebouw.ttl`
  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const user = await triply.getAccount(account)
  const dataset = await user.getDataset(datasetName)
  const { apiUrl } = await triply.getInfo()

  if (args.clean) {
    const linkedData = provenance.activity({
      label: 'Linked data',
      description: 'Conversie van linked data met het met het IFC naar LBD tool, en upload',
    })

    // TODO: ... of als de dataset nog niet bestaat
    if (args.clean || !existsSync(storeCache)) {
      log('Conversie van linked data met het met het IFC naar LBD tool')

      try {
        await executeCommand(
          // Interesting future options (see https://github.com/jyrkioraskari/IFCtoLBD): --hasGeolocation --hasGeometry --hasUnits
          `java -Xms2g -Xmx8g -jar "./src/tools/IFCtoLBD_CLI.jar" "${inputIfc}" --hasBuildingElements --hasBuildingElementProperties --hasSeparateBuildingElementsModel --hasSeparatePropertiesModel --ifcOWL -u="${baseIRI}" -t="${storeCache}"`,
        )
      } catch (error) {
        log((error as Error).message)
      }
    } else {
      log(`${storeCache} gevonden, we maken gebruik van cache`, 'Linked data')
    }

    log('Uploaden van linked data naar TriplyDB')
    await dataset.importFromFiles(
      [
        storeCache,
        `${outputsDir}gebouw_ifcOWL.ttl`,
        `${outputsDir}gebouw_building_elements.ttl`,
        `${outputsDir}gebouw_element_properties.ttl`,
      ],
      {
        defaultGraphName: `${baseIRI}${datasetName}/graph/gebouw`,
        overwriteAll: true,
      },
    )

    provenance.addSeeAlso(linkedData, `${consoleUrl}/datasets/${account ?? user.slug}/${datasetName}`)
    provenance.done(linkedData)
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
