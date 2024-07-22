import { Controle } from '@root/core/Controle.js'
import { StepContext } from '@root/core/executeSteps.js'

export type Data = { geoShape: any; elongation: number }

export default class _ extends Controle<Controle<any, StepContext>, Data> {
  public name = 'Welstand'

  async _run(context: Controle<any, StepContext>): Promise<Data> {
    const geoShape = { _geo: { contains: this.context?.context?.footprint } }
    return { geoShape, elongation: this.context?.context?.elongation ?? -1 }
  }
}
