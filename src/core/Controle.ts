import { headerLogBig } from '@helpers/headerLog.js'
import { createLogger } from '@helpers/logger.js'
import { readdir } from 'fs/promises'
import { PathLike, Dirent } from 'fs'
import path from 'path'

import { GrapoiPointer } from '@core/helpers/grapoi.js'
import { SparqlActivity } from './Activity.js'
import { StepContext } from './executeSteps.js'
import { start, finish } from './helpers/provenance.js'
import { Store as TriplyStore } from '@triplydb/data-factory'
import { BlankNode, NamedNode } from '@rdfjs/types'
import { dct, rdfs } from './helpers/namespaces.js'
import grapoi from 'grapoi'
import factory from '@rdfjs/data-model'

const log = createLogger('checks', import.meta)

export abstract class Controle<Context extends {}, Result extends {}> {
  public abstract name: string
  public path: string
  public id?: number

  // Underlying graph
  public node: BlankNode | NamedNode
  public graph: TriplyStore
  public pointer: GrapoiPointer

  public activity?: GrapoiPointer // TODO: To be removed, keeping it while refactoring

  // Parent-child
  public data?: Result
  public context?: Context
  public constituents: Controle<Controle<Context, Result>, any>[]

  // TODO: Probably more intuitive to define children rather than parent, so as
  // not to rely on side-effects so much, but that is for later
  protected constructor(fullPath: string, parent?: Controle<any, Context>) {
    const p = fullPath.split(path.sep)
    const basename = p[p.length - 1]
    const id = parseInt(basename.split('-')[0])
    this.path = fullPath
    this.id = isNaN(id) ? undefined : id
    this.constituents = []

    this.node = factory.namedNode(`https://example.org/${this.path}`)
    if (parent) {
      this.graph = parent.graph
    } else {
      this.graph = new TriplyStore()
    }
    this.pointer = grapoi({ dataset: this.graph, factory, term: this.node })
  }

  add(controle: Controle<Controle<Context, Result>, any>) {
    if (controle.context && controle.context != this) {
      throw new Error('context is already set')
    }
    controle.context = this
    this.constituents.push(controle)
    this.pointer.addOut(dct('hasPart'), controle.node)
  }

  static async instantiateFromFile(file: string, parent?: Controle<any, any>): Promise<Controle<any, any>> {
    return import(file.replace(/\.ts$/, '.js')).then((m) => new m.default(file, parent))
  }

  static async instantiateFromDirectory(
    directory: string = 'src/controles',
    directory2: string = '../controles',
    parent?: Controle<any, any>,
  ): Promise<Controle<any, any>> {
    const entries = (await readdir(directory, { withFileTypes: true })).sort()
    const directories = entries.filter((f) => f.isDirectory())
    const files = entries.filter((f) => !f.isDirectory() && (f.name.endsWith('.js') || f.name.endsWith('.ts')))

    // Determine the common group of this directory and push all controles as its constituents
    const fIsCommon = (s: string) => s.replace(/\.[tj]s$/, '') == 'common'
    const commonFiles: Dirent[] = files.filter((f) => fIsCommon(f.name))
    const common: Controle<any, any> = commonFiles.length
      ? await Controle.instantiateFromFile(path.join(directory2, commonFiles[0].name), parent)
      : new DefaultCommonControle(directory2, parent)

    // Collect subcontroles from files & directories and add them to the overarching controle
    const fileSubcontroles: Controle<any, any>[] = await Promise.all(
      files
        .filter((f) => !fIsCommon(f.name))
        .map(async (f) => Controle.instantiateFromFile(path.join(directory2, f.name), common)),
    )
    const dirSubcontroles: Controle<any, any>[] = await Promise.all(
      directories.map(async (d) =>
        Controle.instantiateFromDirectory(path.join(directory, d.name), path.join(directory2, d.name), common),
      ),
    )
    const controles = dirSubcontroles.concat(fileSubcontroles)
    for (const c of controles) {
      if (!(c instanceof Controle)) throw new Error('Alles in de controles/ directory moet een Controle zijn')
      common.add(c)
    }

    return common
  }

  async run(context: Context, activity: GrapoiPointer): Promise<Result> {
    headerLogBig(`Controle run: "${this.name}"`, 'yellowBright')

    this.pointer.addOut(rdfs('label'), factory.literal(this.name))

    const prep = start(activity, { name: `Controle ${this.name}` })
    const intermediate = (await this._run(context)) ?? {}
    if (context) Object.assign(intermediate, context)

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
    //@ts-ignore TODO: The base IRI is passed through in a wholly unsustainable way at the moment
    const response = await activity.run({ baseIRI: this.context?.context?.context?.baseIRI })
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

export class DefaultCommonControle extends Controle<StepContext, StepContext> {
  public name: string
  constructor(basename: string, parent?: Controle<any, any>) {
    super(basename, parent)
    this.name = basename
  }
  async _run(context: StepContext) {
    return context
  }
}
