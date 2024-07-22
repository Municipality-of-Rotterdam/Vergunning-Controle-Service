import { headerLogBig } from '@helpers/headerLog.js'
import { createLogger } from '@helpers/logger.js'
import { readdir } from 'fs/promises'
import { PathLike, Dirent } from 'fs'
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
    const fIsCommon = (s: string) => s.replace(/\.[tj]s$/, '') == 'common'
    const fFileToControle: (f: Dirent) => Promise<Controle<any, any>> = (f) =>
      import(`../../${join(f.parentPath, f.name.replace(/\.ts$/, '.js'))}`).then((m) => new m.default(f.name))

    const entries = (await readdir(directory, { withFileTypes: true })).sort()
    const directories = entries.filter((f) => f.isDirectory())
    const files = entries.filter((f) => !f.isDirectory() && (f.name.endsWith('.js') || f.name.endsWith('.ts')))

    // Collect subcontroles from files & directories
    const fileSubcontroles: Controle<any, any>[] = await Promise.all(
      files.filter((f) => !fIsCommon(f.name)).map(fFileToControle),
    )
    const dirSubcontroles: Controle<any, any>[] = (
      await Promise.all(directories.map(async (d) => Controle.instantiateFromDirectory(join(d.parentPath, d.name))))
    ).flat()
    const controles = dirSubcontroles.concat(fileSubcontroles)
    for (const c of controles)
      if (!(c instanceof Controle)) throw new Error('Alles in de controles/ directory moet een Controle zijn')

    // If there is a common group in the directory, then push all controles inside
    const commons: Controle<any, any>[] = await Promise.all(files.filter((f) => fIsCommon(f.name)).map(fFileToControle))
    if (commons.length > 1) {
      throw new Error('Er kan maar 1 `common.ts` in een controlemap zijn')
    } else if (commons.length == 1) {
      const common = commons[0]
      for (const c of controles) common.add(c)
      return [common]
    } else {
      return controles
    }
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
