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
   * Here you have to select the RDF classes which you want to use the SPARQL query so that they can included into the smaller dataset
   * that is used instead of the huge dataset that has many things that we are not interested in.
   *
   * TODO use dataSelectie also as a check to see that the minimum data is in the data store.
   * Stop the VCS if there is no instances of any of these classes.
   */
  dataSelectie: NamedNode<string>[] = []

  /**
   * In the prepare phase you can call APIs and gather outputs.
   * These outputs must be returned in an object. This object must have the type SparqlInputs.
   * You can log after each return value from the API.
   */
  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    // const max = 7
    // Gebruik APIs uit / bronnen om hier waarden te genereren.

    // Hier is `this.groep.data` beschikbaar.

    return { max }
  }

  /**
   * This SPARQL must only return when there is a validation error.
   * This query is used inside the SHACL validator to generate the validation report.
   */
  sparql({ max }: SparqlInputs): string {
    return `
      prefix xsd:   <http://www.w3.org/2001/XMLSchema#>
      prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>
      prefix express: <https://w3id.org/express#>

      SELECT ?this ?aantalVerdiepingen WHERE {
        {
          SELECT ?this ((MAX(?floorNumber)) + 1  AS ?aantalVerdiepingen) WHERE {
            ?this a ifc:IfcBuilding.
            [] a ifc:IfcRelAggregates;
              ifc:relatedObjects_IfcRelAggregates ?storey;
              ifc:relatingObject_IfcRelAggregates ?this.
            ?storey a ifc:IfcBuildingStorey;
              ifc:name_IfcRoot ?storeyLabel.
            ?storeyLabel a ifc:IfcLabel;
              express:hasString ?positiveFloorLabel.
            FILTER(REGEX(?positiveFloorLabel, "^(0*[1-9][0-9]*) .*verdieping$"))
            BIND(xsd:integer(SUBSTR(?positiveFloorLabel, 1 , 2 )) AS ?floorNumber)
          }
          GROUP BY ?this
        }
        FILTER(?aantalVerdiepingen > ${max})
      }
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
