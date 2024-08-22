import dataFactory from '@rdfjs/data-model';
import { prov, rdf, rdfs, xsd } from '@root/core/namespaces.js';
import { provenancePointer } from '@root/provenance/provenance.js';

export const skipStep = (label: string) => {
  const time = performance.now()
  provenancePointer.addOut(rdf('type'), prov('SkipActivity'))
  provenancePointer.addOut(rdfs('label'), dataFactory.literal(label))
  provenancePointer.addOut(prov('startTime'), dataFactory.literal(time.toString(), xsd('double')))
  provenancePointer.addOut(prov('endTime'), dataFactory.literal(time.toString(), xsd('double')))
}

export const SKIP_STEP = 'skip-step'
