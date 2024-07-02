import { headerLogBig } from '@helpers/headerLog.js'
import { createLogger } from '@helpers/logger.js'

import { BaseGroep } from './BaseGroep.js'
import { StepContext } from './executeSteps.js'

const log = createLogger('checks', import.meta)

export abstract class BaseControle<T, G extends {}> {
  readonly id: number
  /**
   * The name shown in the report
   */
  public abstract naam: string

  constructor(filename: string) {
    this.id = parseInt(filename.split('.')[0])
  }

  public groep?: BaseGroep<G>

  setGroup(group: BaseGroep<G>) {
    this.groep = group
  }

  groepData(): G {
    const data = this.groep?.data
    if (!data) throw new Error('Group has no associated data')
    return data
  }
  /**
   * In the prepare phase you can call APIs and gather outputs.
   * These outputs must be returned in an object. This object must have the type SparqlInputs.
   * You can log after each return value from the API.
   */
  abstract voorbereiding(context: StepContext): Promise<T>
  abstract sparql(inputs: T): string // TODO should this not be pulled from TriplyDB?

  abstract bericht(inputs: T): string
  berichtGefaald(inputs: T): string {
    return this.bericht(inputs)
  }
  berichtGeslaagd(inputs: T): string {
    return this.bericht(inputs)
  }

  isToepasbaar(inputs: T): boolean {
    return true
  }

  public sparqlInputs: T | undefined = undefined
  public applicable: boolean | undefined = undefined

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
