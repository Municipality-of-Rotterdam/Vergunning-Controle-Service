import { Polygon, Position } from 'geojson'
import jsonld from 'jsonld'

import { write } from '@jeswr/pretty-turtle'
import dataFactory from '@rdfjs/data-model'
import { Quad } from '@rdfjs/types'
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
      'geo:asWKT': {
        '@value': `<http://www.opengis.net/def/crs/EPSG/0/28992> ${geojsonToWKT(geometry)}`,
        '@type': geo('wktLiteral').value,
      },
    }
  }

  return value
}

export const responseToLinkedData = async (data: any, iri: string) => {
  const json = JSON.stringify(data)
  const jsonWithAdditionalData = JSON.parse(json, addTranslatedGeoData)

  const document: jsonld.JsonLdDocument = {
    '@context': {
      '@vocab': `${iri}#`,
    },
    '@id': iri,
    ...jsonWithAdditionalData,
  }

  const rdfQuads = (await jsonld.toRDF(document)) as Quad[]

  const quads = rdfQuads.map((quad: any) => {
    return dataFactory.quad(quad.subject, quad.predicate, quad.object)
  }) as Quad[]

  return await write(quads)
}
