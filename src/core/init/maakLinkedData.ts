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

    provenance.addSeeAlso(linkedData, `${consoleUrl}/${account ?? user.slug}/${datasetName}`)
    provenance.done(linkedData)
  }

  async function request(url: string, query: string): Promise<any> {
    return fetch(url, {
      body: JSON.stringify({
        query: query,
      }),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Accepts: 'application/sparql-results+json, application/n-triples',
        Authorization: 'Bearer ' + process.env.TRIPLYDB_TOKEN!,
      },
    }).then((response) => response.json())
  }

  // Determine the subject of the building
  const sparqlUrl = `${apiUrl}/datasets/${account ?? user.slug}/${datasetName}/sparql`
  const responseGebouw = await request(
    sparqlUrl,
    `SELECT ?subject WHERE { GRAPH <${baseIRI}${datasetName}/graph/gebouw> { ?subject a <${ifc('IfcBuilding').value}> } }`,
  )
  const gebouwSubject = responseGebouw.length == 1 ? responseGebouw[0]['subject'] : null
  if (!gebouwSubject)
    throw new Error(`Kon het subject van het gebouw niet vinden; response was ${JSON.stringify(responseGebouw)}`)

  // Determine the address of the building
  const responseAddress = await request(
    sparqlUrl,
    `prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>
prefix express: <https://w3id.org/express#>
prefix list: <https://w3id.org/list#>

select ?address where {
  <${gebouwSubject}> ifc:buildingAddress_IfcBuilding ?addressNode.
  ?addressNode ifc:addressLines_IfcPostalAddress ?list.
  ?list list:hasContents ?line.
  ?line express:hasString ?address.
}`,
  )
  const gebouwAddress = responseAddress.length == 1 ? responseAddress[0]['address'] : null
  if (!gebouwAddress)
    throw new Error(`Kon het adres van het gebouw niet vinden; response was ${JSON.stringify(responseAddress)}`)

  return { dataset, gebouwSubject: gebouwSubject as Quad_Subject, gebouwAddress: gebouwAddress }
}
