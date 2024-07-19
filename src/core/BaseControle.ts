import { headerLogBig } from '@helpers/headerLog.js'
import { createLogger } from '@helpers/logger.js'

import { GrapoiPointer } from '@core/helpers/grapoi.js'
import { BaseGroep } from './BaseGroep.js'
import { StepContext } from './executeSteps.js'
import { start, finish } from './helpers/provenance.js'
import { SparqlActivity } from './Activity.js'

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

  public activity?: GrapoiPointer

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
  abstract voorbereiding(context: StepContext, provenance: GrapoiPointer): Promise<T>
  // abstract sparql(inputs: T): string // TODO should this not be pulled from TriplyDB?
  sparql?: (inputs: T) => string

  apiResponse?: any
  sparqlUrl?: string
  abstract tekst: string
  abstract verwijzing: string

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

  public sparqlInputs?: T

  async uitvoering(inputs: T, url?: string): Promise<{ success: boolean | null; message: string }> {
    if (!this.sparql) return { success: null, message: this.bericht(inputs) }
    if (!this.isToepasbaar(inputs)) return { success: null, message: 'Niet van toepassing' }
    if (!url) throw new Error('must have url')
    const sparql = this.sparql(inputs)
    const activity = new SparqlActivity({ name: `SPARQL query ${this.naam}`, body: sparql, url })
    const response = await activity.run(null)
    const result = response[0] ?? null
    const success = result ? result.success ?? false : true
    let message = success ? this.berichtGeslaagd(inputs) : this.berichtGefaald(inputs)

    if (result) {
      for (const [key, value] of Object.entries(result)) {
        message = message.replaceAll(`{?${key}}`, value as string)
      }
    }
    return { success, message }
  }

  log(message: any) {
    log(message, `Controle: "${this.id}. ${this.naam}"`)
  }

  async runPrepare(context: StepContext) {
    headerLogBig(`Controle: "${this.naam}": Voorbereiding`)

    if (this.groep?.activity) this.activity = start(this.groep.activity, { name: this.naam })
    else throw new Error('must have a groep at this point')
    const voorbereiding = start(this.activity, { name: `Voorbereiding ${this.naam}` })
    this.sparqlInputs = await this.voorbereiding(context, voorbereiding)

    if (this.apiResponse) {
      voorbereiding.addOut(context.rpt('apiResponse'), JSON.stringify(this.apiResponse))
      voorbereiding.addOut(context.rpt('apiCall'), this.apiResponse['_links']['self']['href'])
    }
    finish(voorbereiding)
    if (this.sparqlInputs) {
      this.log(this.sparqlInputs)
    }
  }
}
