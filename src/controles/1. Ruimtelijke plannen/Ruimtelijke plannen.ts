import { BaseGroep } from '@core/BaseGroep.js'
import { ifc } from '@helpers/namespaces.js'
import { NamedNode } from '@rdfjs/types'
import { StepContext } from '@root/core/executeSteps.js'

export default class GroepRuimtelijkePlannen extends BaseGroep<{}> {
  public naam = 'Ruimtelijke plannen'

  /** TODO Besluiten of we deze structuur willen houden.
   *
   * Indien we dit verwijderen moeten we ook zorgen dat de hele dataset naar TriplyDB wordt ge-upload in 'upload'
   */
  dataSelectie: NamedNode<string>[] = [
    ifc('IfcBuilding'),
    ifc('IfcBuildingStorey'),
    ifc('IfcRelAggregates'),
    ifc('IfcLabel'),
  ]

  /**
   * Dit is optioneel
   */
  async voorbereiding(context: StepContext) {
    return {}
  }
}
