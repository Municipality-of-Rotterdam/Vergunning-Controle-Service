import { BaseControle } from '@core/BaseControle.js'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'
import { GroepsData } from '@root/controles/01-ruimtelijke-plannen/ruimtelijke-plannen.js'
import { Activity } from '@core/Activity.js'

type SparqlInputs = { elongation: number }

/** Given: Een IFC-model positioneert na georeferentie geheel binnen Welstandsgebied “stempel en
Strokenbouw”
And: Er wordt een IFC-model ingediend van IfcBuilding waarbij de Elementen met het attribuut
“IsExternal” gezamenlijk een bebouwingsstrook vormen met open hoek.
Then: De ruimtelijke inpassing van het gebouw is in overeenstemming met de stempel en strokenbouw -
ruimtelijke inpassing. */

export default class Controle2WelstandRuimtelijkeInpassing extends BaseControle<SparqlInputs, GroepsData> {
  public naam = 'Welstand: Stempel en strokenbouw - Ruimtelijke inpassing'
  public tekst = `Er is sprake van een ‘open verkaveling’ (een herkenbaar ensemble van bebouwingsstroken die herhaald worden) of een ‘halfopen verkaveling’ (gesloten bouwblokken samengesteld uit losse bebouwingsstroken met open hoeken)`
  public verwijzing = ``

  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    return { elongation: context.elongation }
  }

  sparqlUrl = 'undefined'
  sparql(): string {
    return ''
  }

  bericht(): string {
    // TODO: Hardcoded because normally this would be done in a SPARQL query.
    return `De voetafdruk van het gebouw ligt in welstandsgebied 77, type "stempel- en strokenbouw".`
  }
}
