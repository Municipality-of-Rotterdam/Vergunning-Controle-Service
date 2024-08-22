# Hoe voeg je een groep toe?

- Maak het bestand: src/controles/[groep-volgnummer]-[groep]/[groep].ts
- Gebruik deze template:

```TypeScript
import { BaseGroep } from '@core/BaseGroep.js'
import { ifc } from '@helpers/namespaces.js'
import { NamedNode } from '@rdfjs/types'
import { StepContext } from '@root/core/executeSteps.js'

export default class GroepRuimtelijkePlannen extends BaseGroep<{}> {
  public naam = 'Ruimtelijke plannen'

  // Zet hier de classes die je wilt gebruiken in alle SPARQL queries binnen deze groep.
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

    // Hier kun je dingen berekenen / ophalen die van toepassing zijn voor alle controles.
    // Die kun je dan in de controle ophalen door `this.groep.data` uit te lezen

    return {}
  }
}

```

# Hoe voeg je een controle toe?

- Maak het bestand: src/controles/[groep-volgnummer]-[groep]/[volgnummer]-[naam].ts
- Gebruik deze template:

```TypeScript
import { BaseControle } from '@core/BaseControle.js'
import { NamedNode } from '@rdfjs/types'
import { StepContext } from '@root/core/executeSteps.js'

// Change this type to what you want to give to the sparql and message methods.
type SparqlInputs = {
  max: number
}

/**
 * A check for the Rotterdam vergunningscontrole service.
 */
export default class Controle2WonenBebouwingsnormenHoogte extends BaseControle<SparqlInputs> {
  /**
   * The name shown in the report
   */
  public naam = 'Bebouwingsnormen: Hoogte'

  /**
   * In the prepare phase you can call APIs and gather outputs.
   * These outputs must be returned in an object. This object must have the type SparqlInputs.
   * You can log after each return value from the API.
   */
  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    // const max = 7
    // Gebruik APIs uit / bronnen om hier waarden te genereren.

    // Hier is `this.groep.data` beschikbaar.

  }

  /**
   * This SPARQL must only return when there is a validation error.
   * This query is used inside the SHACL validator to generate the validation report.
   */
  sparql({ max }: SparqlInputs): string {
    return `
    `
  }

  /**
   * The message to the end user in the validation report.
   * You must use the same variables as in the sparql method.
   */
  validatieMelding({ max }: SparqlInputs): string {
    return `Gebouw {?this} heeft in totaal {?aantalVerdiepingen} bouwlagen. Dit mag maximaal ${max} zijn.`
  }
}

```
