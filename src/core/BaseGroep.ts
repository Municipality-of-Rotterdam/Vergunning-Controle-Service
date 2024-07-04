import { headerLogBig } from '@helpers/headerLog.js'
import { createLogger } from '@helpers/logger.js'
import { Activity } from './Provenance.js'

import { BaseControle } from './BaseControle.js'
import { StepContext } from './executeSteps.js'

const log = createLogger('checks', import.meta)

export abstract class BaseGroep<T extends {}> {
  public controles: BaseControle<unknown, T>[] = []

  public abstract naam: string
  public activity?: Activity
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

  async runPrepare(context: StepContext) {
    headerLogBig(`Groep: "${this.naam}": Voorbereiding`, 'yellowBright')
    this.activity = context.provenance.activity({ label: this.naam })
    const voorbereiding = context.provenance.activity({ label: `Voorbereiding ${this.naam}`, partOf: this.activity })
    this.data = await this.voorbereiding(context)
    context.provenance.done(voorbereiding)

    if (Object.keys(this.data).length) {
      this.log(this.data)
    }
  }

  log(message: any) {
    log(message, `Groep: "${this.naam}"`)
  }
}
