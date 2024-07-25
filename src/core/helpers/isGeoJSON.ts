// This is not complete!

import { GeoJSON, Feature, FeatureCollection, Geometry } from 'geojson'

export function isGeoJSON(x: any): x is GeoJSON {
  return isGeometry(x) || isFeature(x) || isFeatureCollection(x)
}

export function isGeometry(x: any): x is Geometry {
  return (
    x &&
    x.type &&
    ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection'].indexOf(
      x.type,
    ) != -1
  )
}

export function isFeature(x: any): x is Feature {
  return x && x.type && x.type == 'Feature'
}

export function isFeatureCollection(x: any): x is FeatureCollection {
  return x && x.type && x.type == 'Feature' && x.features && x.features.all(isFeature)
}
