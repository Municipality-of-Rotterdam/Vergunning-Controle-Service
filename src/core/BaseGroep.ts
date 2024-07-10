import { headerLogBig } from '@helpers/headerLog.js'
import { createLogger } from '@helpers/logger.js'

import { GrapoiPointer } from '@core/helpers/grapoi.js'
import { BaseControle } from './BaseControle.js'
import { StepContext } from './executeSteps.js'
import { start, finish } from './helpers/provenance.js'

const log = createLogger('checks', import.meta)

export abstract class BaseGroep<T extends {}> {
  public controles: BaseControle<unknown, T>[] = []

  public abstract naam: string
  public activity?: GrapoiPointer
  public data?: T
  public apiResponse?: any

  setChecks = (controles: BaseControle<unknown, T>[]) => {
    this.controles = controles

    for (const controle of controles) {
      controle.setGroup(this)
    }
  }

  async voorbereiding(context: StepContext): Promise<T> {
    return {} as T
  }

  async runPrepare(context: StepContext, provenance: GrapoiPointer) {
    headerLogBig(`Groep: "${this.naam}": Voorbereiding`, 'yellowBright')
    this.activity = start(provenance, { name: this.naam })
    const voorbereiding = start(this.activity, { name: `Voorbereiding ${this.naam}` })
    this.data = await this.voorbereiding(context)
    finish(voorbereiding)
    finish(this.activity)

    if (Object.keys(this.data).length) {
      this.log(this.data)
    }
  }

  log(message: any) {
    log(message, `Groep: "${this.naam}"`)
  }
}
