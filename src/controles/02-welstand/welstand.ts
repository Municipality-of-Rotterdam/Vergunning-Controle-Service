import { Controle } from '@root/core/Controle.js'
import { StepContext } from '@root/core/executeSteps.js'

export type Data = { geoShape: any; elongation: number }

export default class _ extends Controle<StepContext, Data> {
  public name = 'Welstand'

  async _run(context: StepContext): Promise<Data> {
    const geoShape = { _geo: { contains: context.footprint } }
    return { geoShape, elongation: context.elongation }
  }
}
