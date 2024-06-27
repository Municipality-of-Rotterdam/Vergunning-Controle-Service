import { headerLogBig } from '@helpers/headerLog.js'
import { createLogger } from '@helpers/logger.js'
import { NamedNode } from '@rdfjs/types'
import { Store as TriplyStore } from '@triplydb/data-factory'

import { BaseGroep } from './BaseGroep.js'
import { StepContext } from './executeSteps.js'

const log = createLogger('checks', import.meta)

export abstract class BaseControle<T> {
  readonly id: number

  public abstract naam: string

  constructor(filename: string) {
    this.id = parseInt(filename.split('.')[0])
  }

  public groep?: BaseGroep<{}>

  setGroup(group: BaseGroep<{}>) {
    this.groep = group
  }

  abstract voorbereiding(context: StepContext): Promise<T>
  abstract sparql(inputs: T): string // TODO should this not be pulled from TriplyDB?

  abstract bericht(inputs: T): string
  berichtGefaald(inputs: T): string {
    return this.bericht(inputs)
  }
  berichtGeslaagd(inputs: T): string {
    return this.bericht(inputs)
  }

  public sparqlInputs: T | undefined = undefined

  log(message: any) {
    log(message, `Controle: "${this.id}. ${this.naam}"`)
  }

  async runPrepare(context: StepContext) {
    headerLogBig(`Controle: "${this.naam}": Voorbereiding`)

    this.sparqlInputs = await this.voorbereiding(context)
    if (this.sparqlInputs) {
      this.log(this.sparqlInputs)
    }
  }
}
