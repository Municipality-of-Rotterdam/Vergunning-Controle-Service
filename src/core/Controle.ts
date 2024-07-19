import { headerLogBig } from '@helpers/headerLog.js'
import { createLogger } from '@helpers/logger.js'
import { readdir } from 'fs/promises'
import { PathLike } from 'fs'
import { join, relative } from 'path'

import { GrapoiPointer } from '@core/helpers/grapoi.js'
import { SparqlActivity } from './Activity.js'
import { StepContext } from './executeSteps.js'
import { start, finish } from './helpers/provenance.js'
// import { Store as TriplyStore } from '@triplydb/data-factory'

const log = createLogger('checks', import.meta)

export abstract class Controle<Context, Result extends {}> {
  public abstract name: string
  public id?: number
  // public report?: GrapoiPointer
  // public reportGraph?: TriplyStore
  public activity?: GrapoiPointer // TODO: To be removed, keeping it while refactoring
  public data?: Result
  public context?: Context
  public constituents: Controle<Controle<Context, Result>, any>[]

  constructor(basename: string) {
    const id = parseInt(basename.split('-')[0])
    this.id = isNaN(id) ? undefined : id
    this.constituents = []
  }

  add(controle: Controle<Controle<Context, Result>, any>) {
    if (controle.context && controle.context != this) {
      throw new Error('context is already set')
    }
    controle.context = this
    this.constituents.push(controle)
  }

  static async instantiateFromDirectory(directory: PathLike): Promise<Controle<any, any>[]> {
    const entries = (await readdir(directory, { withFileTypes: true })).sort()
    const directories = entries.filter((f) => f.isDirectory())
    const files = entries.filter((f) => !f.isDirectory() && (f.name.endsWith('.js') || f.name.endsWith('.ts')))

    // Import controles
    let controles = await Promise.all(
      files.map((f) =>
        import(`../../${join(f.parentPath, f.name.replace(/\.ts$/, '.js'))}`).then((m) => new m.default(f.name)),
      ),
    )
    for (const c of controles)
      if (!(c instanceof Controle)) throw new Error('Alles in de controles/ directory moet een Controle zijn')

    // If there is a group (any file without an id), push all controles in there
    const controleGroep = controles.filter((c) => c.id === undefined)
    if (controleGroep.length > 1) {
      throw new Error('Er kan maar 1 groep in een controlemap zijn')
    } else if (controleGroep.length == 1) {
      const groep = controleGroep[0]
      for (const c of controles.filter((c) => c.id !== undefined)) groep.add(c)
      controles = [groep]
    }

    // Do the same for anything hidden in directories
    for (const d of directories) {
      const other = await Controle.instantiateFromDirectory(join(d.parentPath, d.name))
      for (const o of other) controles.push(o)
    }

    return controles
  }

  async run(context: Context, activity: GrapoiPointer): Promise<Result> {
    headerLogBig(`Controle run: "${this.name}"`, 'yellowBright')

    const prep = start(activity, { name: `Controle ${this.name}` })
    const intermediate = await this._run(context)
    this.context = context
    this.activity = prep
    this.data = intermediate
    for (const p of this.constituents) {
      // p is an instance of Controle<Controle<Context, T>, any>
      await p.run(this, prep)
    }

    if (this.apiResponse) {
      // prep.addOut(context.rpt('apiResponse'), JSON.stringify(this.apiResponse))
      // prep.addOut(context.rpt('apiCall'), this.apiResponse['_links']['self']['href'])
    }
    finish(prep)
    // this.log(this.data)

    return intermediate
  }
  abstract _run(context: Context): Promise<Result>

  // TODO: Refactor below
  apiResponse?: any
  sparqlUrl?: string
  tekst?: string
  verwijzing?: string
  bericht(inputs: Result): string {
    return 'nvt'
  }
  berichtGefaald(inputs: Result): string {
    return this.bericht(inputs)
  }
  berichtGeslaagd(inputs: Result): string {
    return this.bericht(inputs)
  }
  isToepasbaar(_: Result): boolean {
    return true
  }
  sparql?: (inputs: Result) => string

  async uitvoering(inputs: Result, url?: string): Promise<{ success: boolean | null; message: string }> {
    if (!this.sparql) return { success: null, message: this.bericht(inputs) }
    if (!this.isToepasbaar(inputs)) return { success: null, message: 'Niet van toepassing' }
    if (!url) throw new Error('must have url')
    const sparql = this.sparql(inputs)
    const activity = new SparqlActivity({ name: `SPARQL query ${this.name}`, body: sparql, url })
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
    log(message, `Controle: "${this.name}"`)
  }
}
