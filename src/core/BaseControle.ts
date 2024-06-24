import { headerLogBig } from '@helpers/headerLog.js'
import { createLogger } from '@helpers/logger.js'
import { NamedNode } from '@rdfjs/types'
import { Store as TriplyStore } from '@triplydb/data-factory'

import { BaseGroep } from './BaseGroep.js'
import { StepContext } from './executeSteps.js'

const log = createLogger('checks', import.meta)

export abstract class BaseControle<T, G extends {}> {
  readonly id: number

  public abstract naam: string

  constructor(filename: string) {
    this.id = parseInt(filename.split('.')[0])
  }

  public groep?: BaseGroep<G>

  setGroup(group: BaseGroep<G>) {
    this.groep = group
  }

  abstract voorbereiding(context: StepContext): Promise<T>
  abstract sparql(inputs: T): string // TODO should this not be pulled from TriplyDB?
  abstract validatieMelding(inputs: T): string

  public processedSparql: string = ''
  public processedMessage: string = ''

  log(message: any) {
    log(message, `Controle: "${this.id}. ${this.naam}"`)
  }

  async runPrepare(context: StepContext) {
    headerLogBig(`Controle: "${this.naam}": Voorbereiding`)

    const sparqlInputs = await this.voorbereiding(context)
    if (sparqlInputs) {
      this.log(sparqlInputs)
    }

    this.processedSparql = this.sparql(sparqlInputs)
    this.processedMessage = this.validatieMelding(sparqlInputs)
  }
}
