import { Controle } from '@root/core/Controle.js'
import { StepContext } from '@root/core/executeSteps.js'

export default class _ extends Controle<StepContext, {}> {
  public name = 'Welstand'

  async run(): Promise<{}> {
    return {}
  }
}
