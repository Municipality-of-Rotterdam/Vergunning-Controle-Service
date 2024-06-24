import { headerLogBig } from '@helpers/headerLog.js'
import { createLogger } from '@helpers/logger.js'
import { NamedNode } from '@rdfjs/types'

import { BaseControle } from './BaseControle.js'
import { StepContext } from './executeSteps.js'

const log = createLogger('checks', import.meta)

export abstract class BaseGroep<T extends {}> {
  public controles: BaseControle<unknown, T>[] = []

  public abstract naam: string

  public data?: T

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
    this.data = await this.voorbereiding(context)

    if (Object.keys(this.data).length) {
      this.log(this.data)
    }
  }

  log(message: any) {
    log(message, `Groep: "${this.naam}"`)
  }
}
