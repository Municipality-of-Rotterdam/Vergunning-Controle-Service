import { Controle } from '@root/core/Controle.js'
import { Data } from '../common.js'
import { StepContext } from '@root/core/executeSteps.js'

export default class _ extends Controle<StepContext & Data, {}> {
  public name = 'Wonen'
  async run() {
    return {}
  }
}
