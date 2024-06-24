import { BaseControle } from '@core/BaseControle.js'
import { StepContext } from '@root/core/executeSteps.js'

export default class Controle2WonenBebouwingsnormen extends BaseControle<{}> {
  public naam = 'Bestemmingsomschrijving'
  async voorbereiding(context: StepContext): Promise<{}> {
    return {}
  }
  // Pulled from <https://demo.triplydb.com/rotterdam/-/queries/3-Wonen-bebouwingsnormen-vorm/1>
  sparql(): string {
    return `
      prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>

      select ?roof ?rooftype where {

        ?this a ifc:IfcBuilding.

        [] ifc:relatingObject_IfcRelAggregates ?this;
          ifc:relatedObjects_IfcRelAggregates ?storey.

        [] ifc:relatingStructure_IfcRelContainedInSpatialStructure ?storey ;
          ifc:relatedElements_IfcRelContainedInSpatialStructure ?roof .

        ?roof ifc:predefinedType_IfcRoof ?rooftype .

        filter (?rooftype != ifc:FLAT_ROOF)
      }
    `
  }

  validatieMelding(): string {
    return `Dak {?roof} heeft het daktype "{?rooftype}". Dit moet "FLAT_ROOF'" zijn.`
  }
}
