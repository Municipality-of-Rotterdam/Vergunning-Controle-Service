// This is not complete!

import { GeoJSON, Feature, FeatureCollection, Polygon, MultiPolygon, Geometry, GeometryCollection } from 'geojson'

export function isGeoJSON(x: any): x is GeoJSON {
  return isGeometry(x) || isFeature(x) || isFeatureCollection(x)
}

export function isGeometry(x: any): x is Geometry {
  return (
    x &&
    x.type &&
    ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].indexOf(x.type) != -1
  )
}

export function isPolygon(x: any): x is Polygon {
  return x && x.type && x.type == 'Polygon'
}

export function isMultiPolygon(x: any): x is MultiPolygon {
  return x && x.type && x.type == 'MultiPolygon'
}

export function isGeometryCollection(x: any): x is GeometryCollection {
  return x && x.type && x.type == 'GeometryCollection'
}

export function isFeature(x: any): x is Feature {
  return x && x.type && x.type == 'Feature'
}

export function isFeatureCollection(x: any): x is FeatureCollection {
  return x && x.type && x.type == 'FeatureCollection' && x.features && x.features.every(isFeature)
}
