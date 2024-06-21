import { existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import grapoi from 'grapoi'

import { getCheckGroups } from '@core/controles.js'
import { StepContext } from '@core/executeSteps.js'
import { createExecutor } from '@helpers/executeCommand.js'
import { createLogger } from '@helpers/logger.js'
import { express, ifc, rdf, rdfs } from '@helpers/namespaces.js'
import { parseToStore } from '@helpers/parseToStore.js'
import { writeTurtle } from '@helpers/writeTurtle.js'
import factory from '@rdfjs/data-model'
import { Quad_Subject } from '@rdfjs/types'
import { Store as TriplyStore } from '@triplydb/data-factory'

import { addLinkedDataToStore } from './addLinkedDataToStore.js'

import type { GrapoiPointer } from '@helpers/grapoi.js'
const executeCommand = createExecutor('linked-data', import.meta, 'Linked Data')
const log = createLogger('linked-data', import.meta, 'Linked Data')

export const maakLinkedData = async ({
  outputsDir,
  inputIfc,
  baseIRI,
}: Pick<StepContext, 'outputsDir' | 'inputIfc' | 'baseIRI'>) => {
  const storeCache = `${outputsDir}/gebouw.ttl`
  if (!existsSync(storeCache)) {
    log('Omvormen van de invoer .ifc naar Linked Data')

    const dataset = new TriplyStore()

    const resolvedOutputTurtle = `${outputsDir}/data.ttl`
    if (!existsSync(resolvedOutputTurtle)) {
      try {
        await executeCommand(
          `java -jar "./src/tools/IFCtoLBD_CLI.jar" "${inputIfc}" --hasBuildingElements --hasBuildingElementProperties --ifcOWL -u="${baseIRI}" -t="${resolvedOutputTurtle}"`,
          // TODO Check met Kathrin welke variant we moeten gebruiken.
          // `java -jar "./src/tools/IFCtoLBD_CLI.jar" "${inputIfc}" -be --hasGeolocation --hasGeometry --hasUnits --hasBuildingElementProperties --ifcOWL -l100 -u=${baseIRI}  -t="${resolvedOutputTurtle}"`
        )
      } catch (error) {
        log((error as Error).message)
      }
    } else {
      log('Omzetting overgeslagen, we maken gebruik van cache bestanden', 'IFCtoLBD')
    }

    await addLinkedDataToStore(outputsDir, dataset)
    const groups = await getCheckGroups()

    const classes = groups.flatMap((group) => {
      return [...group.dataSelectie, ...group.controles.flatMap((check) => check.dataSelectie)]
    })
    const pointer: GrapoiPointer = grapoi({ dataset, factory })
    const filteredPointers = pointer.hasOut(rdf('type'), classes).out()

    const focusedDataset = new TriplyStore([...filteredPointers.quads()] as any)

    const output = await writeTurtle([...focusedDataset])
    await writeFile(storeCache, output, 'utf8')
    log('Opslaan van gebouw.ttl')
  } else {
    log('gebouw.ttl gevonden, we maken gebruik van cache', 'Linked Data')
  }

  const focusedDataset = new TriplyStore()
  await parseToStore(`${outputsDir}/gebouw.ttl`, focusedDataset)

  // Determine the subject of the building
  const pointer: GrapoiPointer = grapoi({ dataset: focusedDataset, factory })
  const building = pointer.hasOut(rdf('type'), ifc('IfcBuilding'))
  if (!building.term) throw new Error('Kon niet het subject vinden van het gebouw')
  return { focusedDataset, gebouwSubject: building.term as Quad_Subject }
}
