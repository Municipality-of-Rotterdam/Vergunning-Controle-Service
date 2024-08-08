import { existsSync } from 'fs'

import { StepContext } from '@core/executeSteps.js'
import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'
import { ifc, rdfs, xsd } from '@helpers/namespaces.js'
import { Quad_Subject } from '@rdfjs/types'
import App from '@triply/triplydb'
import factory from '@rdfjs/data-model'

import { Activity } from './Activity.js'

import type { GrapoiPointer } from '@helpers/grapoi.js'
const executeCommand = createExecutor('linked-data', import.meta, 'Linked data')
const log = createLogger('linked-data', import.meta, 'Linked data')

export const linkedData = new Activity(
  {
    name: 'Linked Data',
    description: 'Conversie van het IFC bestand naar linked data met het IFCtoLBD tool, en upload naar TriplyDB',
  },
  async (
    {
      account,
      args,
      baseIRI,
      consoleUrl,
      datasetName,
      inputIfc,
      outputsDir,
    }: Pick<StepContext, 'account' | 'args' | 'baseIRI' | 'consoleUrl' | 'datasetName' | 'inputIfc' | 'outputsDir'>,
    thisActivity: Activity<any, any>,
  ) => {
    const storeCache = `${outputsDir}gebouw.ttl`
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const user = await triply.getAccount(account)
    const dataset = await user.getDataset(datasetName)
    const { apiUrl } = await triply.getInfo()

    if (args.clean) {
      // TODO: ... of als de dataset nog niet bestaat
      if (args.clean || !existsSync(storeCache)) {
        log('Conversie van het IFC bestand naar linked data met het IFCtoLBD tool')

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
          defaultGraphName: `${baseIRI}graph/gebouw`,
          overwriteAll: true,
        },
      )

      thisActivity.provenance?.addOut(rdfs('seeAlso'), factory.literal(`${baseIRI}`, xsd('anyURI')))
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
      `SELECT ?subject WHERE { GRAPH <${baseIRI}graph/gebouw> { ?subject a <${ifc('IfcBuilding').value}> } }`,
    )
    const gebouwSubject = responseGebouw.length == 1 ? responseGebouw[0]['subject'] : null
    if (!gebouwSubject)
      throw new Error(
        `Kon het subject van het gebouw niet vinden in ${baseIRI}graph/gebouw; response was ${JSON.stringify(responseGebouw)}`,
      )

    // Determine the address of the building
    const responseAddress = await request(
      sparqlUrl,
      `prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>
prefix express: <https://w3id.org/express#>
prefix list: <https://w3id.org/list#>

select ?address where {
  graph <${baseIRI}graph/gebouw> {
    <${gebouwSubject}> ifc:buildingAddress_IfcBuilding ?addressNode.
    ?addressNode ifc:addressLines_IfcPostalAddress ?list.
    ?list list:hasContents ?line.
    ?line express:hasString ?address.
  }
}`,
    )
    const gebouwAddress = responseAddress.length == 1 ? responseAddress[0]['address'] : null
    if (!gebouwAddress)
      throw new Error(`Kon het adres van het gebouw niet vinden; response was ${JSON.stringify(responseAddress)}`)

    return { dataset, gebouwSubject: gebouwSubject as Quad_Subject, gebouwAddress: gebouwAddress }
  },
)
