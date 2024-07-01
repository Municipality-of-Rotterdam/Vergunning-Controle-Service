import { Store as TriplyStore } from '@triplydb/data-factory'

import grapoi from 'grapoi'
import factory from '@rdfjs/data-model'
import { dct, prov, skos, xsd, rdf, rdfs } from '@helpers/namespaces.js'
import type { GrapoiPointer } from '@helpers/grapoi.js'

export type ActivityInfo = {
  label: string
  description: string
  seeAlso: string
  source: string
  partOf: Activity
}

export type Activity = GrapoiPointer

export default class Provenance extends TriplyStore {
  baseIRI: string
  constructor(baseIRI: string) {
    super()
    this.baseIRI = baseIRI
  }

  activity(a: Partial<ActivityInfo>): Activity {
    const now = new Date()
    const label = a.label ? `${this.baseIRI}/${a.label.replace(/\W/g, '')}` : null
    const p = grapoi({ dataset: this, factory, term: label ? factory.namedNode(label) : factory.blankNode })
    p.addOut(rdf('type'), prov('Activity'))
    if (a.partOf) a.partOf.addOut(dct('hasPart'), p)
    if (a.label) p.addOut(skos('prefLabel'), factory.literal(a.label, 'nl'))
    if (a.description) p.addOut(dct('description'), factory.literal(a.description, 'en'))
    if (a.seeAlso) p.addOut(rdfs('seeAlso'), factory.literal(a.seeAlso, xsd('anyURI')))
    p.addOut(prov('startedAtTime'), factory.literal(now.toISOString(), xsd('dateTime')))
    return p
  }

  done(activity: Activity) {
    const now = new Date()
    activity.addOut(prov('endedAtTime'), factory.literal(now.toISOString(), xsd('dateTime')))
  }
}
