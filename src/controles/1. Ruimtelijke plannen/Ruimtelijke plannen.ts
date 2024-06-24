import { BaseGroep } from '@core/BaseGroep.js'
import { StepContext } from '@root/core/executeSteps.js'

export default class GroepRuimtelijkePlannen extends BaseGroep<{}> {
  public naam = 'Ruimtelijke plannen'

  /**
   * Dit is optioneel
   */
  async voorbereiding(context: StepContext) {
    return {}
  }
}
