import namespace from '@rdfjs/namespace'

export const express = namespace('https://w3id.org/express#')
export const geo = namespace('http://www.opengis.net/ont/geosparql#')
export const sf = namespace('http://www.opengis.net/ont/sf#')
export const ifc = namespace('https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#')
export const rdf = namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
export const rdfs = namespace('http://www.w3.org/2000/01/rdf-schema#')
export const prov = namespace('http://www.w3.org/ns/prov#')
export const skos = namespace('http://www.w3.org/2004/02/skos/core#')
export const dct = namespace('http://purl.org/dc/terms/')
export const sh = namespace('http://www.w3.org/ns/shacl#')
export const xsd = namespace('http://www.w3.org/2001/XMLSchema#')
export const qudt = namespace('http://qudt.org/schema/qudt/')
export const litre = namespace('http://purl.org/spar/literal#')
export const http = namespace('http://www.w3.org/2011/http#')

export const prefixes = Object.fromEntries(
  Object.entries({
    express,
    geo,
    sf,
    ifc,
    rdf,
    rdfs,
    prov,
    skos,
    dct,
    sh,
    xsd,
    qudt,
    litre,
    http,
  }).map(([alias, namespace]) => [alias, namespace().value]),
)

export const prefixString = Object.entries(prefixes)
  .map(([alias, prefix]) => `prefix ${alias}: <${prefix}>\n`)
  .join('')
