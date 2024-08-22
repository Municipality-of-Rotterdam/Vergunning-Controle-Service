import { Polygon, Position } from 'geojson'
import jsonld from 'jsonld'

import dataFactory from '@rdfjs/data-model'
import { BlankNode, Quad, Quad_Object, Quad_Predicate, Quad_Subject, Term } from '@rdfjs/types'
import { geo, sf } from '@root/core/namespaces.js'
import { geojsonToWKT } from '@terraformer/wkt'

const gmlToGeoJson = (value: string) => {
  const numbers: number[] = value.split(' ').map((x: string) => parseFloat(x))

  const coordsPolygon: Position[] = []
  for (let i = 0; i < numbers.length - 1; i += 2) {
    coordsPolygon.push([numbers[i], numbers[i + 1]])
  }
  coordsPolygon.push([numbers[0], numbers[1]])
  return {
    type: 'Polygon',
    coordinates: [coordsPolygon],
  } as Polygon
}

function addTranslatedGeoData(this: any, key: string, value: any) {
  let geometry

  if (key === 'gml:Polygon') {
    const shape = value['gml:exterior']['gml:LinearRing']['gml:posList']
    geometry = gmlToGeoJson(shape)
  }

  if (key === 'geometrie') geometry = value

  if (geometry) {
    value[geo('hasDefaultGeometry').value] = {
      '@type': sf(geometry.type).value,
      [geo('asWKT').value]: {
        '@value': `<http://www.opengis.net/def/crs/EPSG/0/28992> ${geojsonToWKT(geometry)}`,
        '@type': geo('wktLiteral').value,
      },
    }
  }

  return value
}

export const responseToLinkedData = async (
  data: any,
  apiUrl: string,
  buildingUri: string,
  instanceUri: string,
): Promise<Quad[]> => {
  const json = JSON.stringify(data)
  const jsonWithAdditionalData = JSON.parse(json, addTranslatedGeoData)
  const vocab = `${apiUrl.replace(/#$/, '')}#`

  const document: jsonld.JsonLdDocument = {
    '@context': {
      '@vocab': vocab,
    },
    '@id': instanceUri,
    '@reverse': { [vocab]: { '@id': buildingUri } },
    ...jsonWithAdditionalData,
  }
  return jsonldToQuads(document)
}

export const jsonldToQuads = async (data: jsonld.JsonLdDocument): Promise<Quad[]> => {
  const rdfQuads = (await jsonld.toRDF(data)) as Quad[]

  // Avoid serialization issue when combining quads from multiple sources: remap blank nodes to fresh blank nodes
  const termMap: { [key: string]: BlankNode } = {}
  const termMapper = (term: Term) => {
    if (term.termType == 'BlankNode') {
      if (!term.value) return dataFactory.blankNode()
      if (termMap[term.value] === undefined) termMap[term.value] = dataFactory.blankNode()
      return termMap[term.value]
    } else return term
  }

  dataFactory.blankNode()
  const quads = rdfQuads.map((quad: any) =>
    dataFactory.quad(
      termMapper(quad.subject) as Quad_Subject,
      termMapper(quad.predicate) as Quad_Predicate,
      termMapper(quad.object) as Quad_Object,
    ),
  ) as Quad[]
  return quads
}
