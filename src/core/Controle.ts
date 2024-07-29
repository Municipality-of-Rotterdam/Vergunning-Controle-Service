import { headerLogBig } from '@helpers/headerLog.js'
import { createLogger } from '@helpers/logger.js'
import { readdir } from 'fs/promises'
import { Dirent } from 'fs'
import path from 'path'
import chalk from 'chalk'
import App from '@triply/triplydb'

import { GrapoiPointer } from '@core/helpers/grapoi.js'
import { SparqlActivity } from './Activity.js'
import { StepContext } from './executeSteps.js'
import { start, finish } from './helpers/provenance.js'
import { Store as TriplyStore } from '@triplydb/data-factory'
import { BlankNode, NamedNode } from '@rdfjs/types'
import { dct, rdfs, skos, geo, sf, rdf, litre, xsd, prov } from './helpers/namespaces.js'
import grapoi from 'grapoi'
import { Feature } from 'geojson'
import { isFeature } from './helpers/isGeoJSON.js'
import factory from '@rdfjs/data-model'
import { geojsonToWKT } from '@terraformer/wkt'

const log = createLogger('checks', import.meta)

export abstract class Controle<Context extends Partial<StepContext>, Result extends {}> {
  public abstract name: string
  public path: string
  public id?: number

  // Underlying graph
  public node: BlankNode | NamedNode
  public graph: TriplyStore
  public pointer: GrapoiPointer

  public activity?: GrapoiPointer // TODO: To be removed, keeping it while refactoring

  public data?: Context & Result
  public parent?: Controle<any, Context>
  public children: Controle<Context & Result, any>[]

  public status?: boolean | null
  public info: { [key: string]: number | string | Feature | { text: string; url: string } }

  // TODO: Probably more intuitive to define children rather than parent, so as
  // not to rely on side-effects so much, but that is for later
  protected constructor(fullPath: string, parent?: Controle<any, Context>) {
    const p = fullPath.split(path.sep)
    const basename = p[p.length - 1]
    const id = parseInt(basename.split('-')[0])
    this.path = fullPath
    this.id = isNaN(id) ? undefined : id
    this.children = []

    this.info = {}

    this.node = factory.namedNode(`https://example.org/${this.path}`)
    if (parent) {
      this.graph = parent.graph
    } else {
      this.graph = new TriplyStore()
    }
    this.pointer = grapoi({ dataset: this.graph, factory, term: this.node })
  }

  add(controle: Controle<Context & Result, any>) {
    this.children.push(controle)
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

    if (commonFiles.length != 1) throw new Error('Er moet een overkoepelende `common.ts` controle zijn')

    const common: Controle<any, any> = await Controle.instantiateFromFile(
      path.join(directory2, commonFiles[0].name),
      parent,
    )

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

  applicable(_: Result): boolean {
    return true
  }

  async runAll(context: Context, activity: GrapoiPointer): Promise<Result> {
    const { rpt, account, datasetName } = context as StepContext // TODO

    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const user = await triply.getAccount(account)
    const { apiUrl } = await triply.getInfo()

    headerLogBig(`Controle: "${this.name}"`, 'yellowBright')

    const prep = start(activity, { name: `Controle ${this.name}` })
    this.activity = prep

    const result = Object.assign({}, context, await this.run(context))
    this.data = result

    let success: boolean | null | undefined = undefined
    let message: string | undefined = undefined
    if (!this.children) {
      const r = await this.uitvoering(result, `${apiUrl}/datasets/${account ?? user.slug}/${datasetName}/sparql`)
      success = r.success
      message = r.message
    }

    for (const p of this.children) await p.runAll(result, prep)
    finish(prep)

    // Log to console
    if (success === null || success == undefined) {
      log(message, this.name)
    } else if (success) {
      log(chalk.greenBright(`✅ ${message}`), this.name)
    } else {
      log(chalk.redBright(`❌ ${message}`), this.name)
    }

    // Write RDF
    this.pointer.addOut(rdfs('label'), factory.literal(this.name))
    this.pointer.addOut(rdf('type'), rpt('Controle'))
    this.pointer.addOut(rdfs('label'), this.name)
    if (this.tekst) this.pointer.addOut(dct('description'), factory.literal(this.tekst, 'nl'))
    if (this.verwijzing) this.pointer.addOut(rpt('verwijzing'), factory.literal(this.verwijzing, 'nl'))
    if (this.sparqlUrl) this.pointer.addOut(rpt('sparqlUrl'), factory.literal(this.sparqlUrl, xsd('anyUri')))
    if (success !== undefined)
      this.pointer.addOut(rpt('passed'), factory.literal((success == null ? true : success).toString(), xsd('boolean')))
    if (message !== undefined) this.pointer.addOut(rpt('message'), factory.literal(message, rdf('HTML')))
    this.pointer.addOut(prov('wasGeneratedBy'), this.activity?.term)

    if (this.apiResponse) {
      // prep.addOut(context.rpt('apiResponse'), JSON.stringify(this.apiResponse))
      // prep.addOut(context.rpt('apiCall'), this.apiResponse['_links']['self']['href'])
    }
    // this.log(this.data)

    // Save anything that was saved to the `info` object also to the RDF report
    for (const [k, v] of Object.entries(this.info)) {
      if (isFeature(v)) {
        this.pointer.addOut(skos('related'), (p: GrapoiPointer) => {
          const descr = v.properties?.popupContent
          p.addOut(skos('prefLabel'), factory.literal(k, 'nl'))
          if (descr) p.addOut(dct('description'), factory.literal(descr, 'nl'))
          p.addOut(rdf('type'), sf(v.geometry.type))
          p.addOut(geo('coordinateDimension'), factory.literal('2', xsd('integer')))
          const wkt = geojsonToWKT(v.geometry)
          p.addOut(
            geo('asWKT'),
            factory.literal(`<http://www.opengis.net/def/crs/EPSG/0/28992> ${wkt}`, geo('wktLiteral')),
          )
        })
      } else {
        this.pointer.addOut(skos('related'), (p: GrapoiPointer) => {
          const t = typeof v == 'number' ? xsd('number') : undefined
          p.addOut(skos('prefLabel'), factory.literal(k, 'nl'))
          if (v.hasOwnProperty('url')) {
            //@ts-ignore
            p.addOut(rdfs('seeAlso'), factory.literal(v.url, xsd('anyURI')))
            //@ts-ignore
            p.addOut(litre('hasLiteral'), factory.literal(v.text, t))
          } else {
            p.addOut(litre('hasLiteral'), factory.literal(v.toString(), t))
          }
        })
      }
    }

    return result
  }
  abstract run(context: Context): Promise<Result>

  // TODO: Refactor below
  apiResponse?: any
  sparqlUrl?: string
  tekst?: string
  verwijzing?: string
  bericht(inputs: Result): string {
    return 'n.v.t.'
  }

  sparql?: (inputs: Result) => string

  async uitvoering(inputs: Context & Result, url?: string): Promise<{ success: boolean | null; message: string }> {
    if (!this.sparql || !this.applicable(inputs)) {
      const result = { success: null, message: this.bericht(inputs) }
      this.status = null
      this.info['Resultaat'] = result.message
      return result
    }
    if (!url) throw new Error('must have url')
    const sparql = this.sparql(inputs)
    const activity = new SparqlActivity({ name: `SPARQL query ${this.name}`, body: sparql, url })
    //@ts-ignore TODO
    const response = await activity.run({ baseIRI: inputs.baseIRI })
    const result = response[0] ?? null
    const success: boolean = result ? result.success == 'true' ?? false : true
    let message = this.bericht(inputs)

    if (result) {
      for (const [key, value] of Object.entries(result)) {
        message = message.replaceAll(`{?${key}}`, value as string)
      }
    }

    this.status = success
    this.info['Resultaat'] = message

    return { success, message }
  }

  log(message: any) {
    log(message, `Controle: "${this.name}"`)
  }
}
