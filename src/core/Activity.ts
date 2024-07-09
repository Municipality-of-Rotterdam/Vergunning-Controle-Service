import grapoi from 'grapoi'
import { GrapoiPointer } from './helpers/grapoi.js'
import { dct, prov, skos, xsd, rdf, rdfs, rpt } from '@helpers/namespaces.js'
import factory from '@rdfjs/data-model'

import { headerLog } from '@helpers/headerLog.js'

type ActivityInfo = {
  name: string
  description?: string
}

export class Activity<S extends {}, T extends {}> {
  constructor(
    { name, description }: ActivityInfo,
    action: (ctx: S, provenance: GrapoiPointer) => Promise<void | T>,
    children?: Activity<S, T>[],
  ) {
    this.name = name
    this.description = description
    this.action = action
    this.children = children ?? []
  }
  public name: string
  public description?: string
  public action: (ctx: S, provenance: GrapoiPointer) => Promise<void | T>
  public provenance?: GrapoiPointer
  public parent?: Activity<any, any>

  public children: Activity<S, T>[]
  async run(ctx: S): Promise<void | T> {
    headerLog(this.name)
    const label = this.name ? `https://demo.triplydb.com/rotterdam/${this.name.replace(/\W/g, '')}` : null
    const provenanceNode = label ? factory.namedNode(label) : factory.blankNode

    /* @ts-ignore TODO. forgive me */
    const db = ctx.provenanceDataset
    if (!db) throw new Error('should have a database at this point')

    let provenance: GrapoiPointer
    if (this.parent) {
      if (!this.parent.provenance) {
        throw new Error('should have provenance at this point')
      }
      this.parent.provenance.addOut(dct('hasPart'), provenanceNode)
    }
    this.provenance = provenance = grapoi({ dataset: db, factory, term: provenanceNode })

    provenance.addOut(rdf('type'), prov('Activity'))
    provenance.addOut(skos('prefLabel'), factory.literal(this.name))
    if (this.description) provenance.addOut(dct('description'), factory.literal(this.description))
    provenance.addOut(prov('startedAtTime'), factory.literal(new Date().toISOString(), xsd('dateTime')))

    this.prepare()
    const mainResult = await this.action(ctx, provenance)
    if (mainResult) {
      Object.assign(ctx, mainResult)
    }
    for (const child of this.children ?? []) {
      child.parent = this
      const childResult = await child.run(ctx)
      if (childResult) {
        Object.assign(ctx, childResult)
      }
    }
    this.finish()
    provenance.addOut(prov('endedAtTime'), factory.literal(new Date().toISOString(), xsd('dateTime')))

    return ctx as unknown as T
  }
  prepare() {}
  finish() {}
}
