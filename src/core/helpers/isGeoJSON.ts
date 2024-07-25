// This is not complete!

import { GeoJSON } from 'geojson'

const types = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection']

export function isGeoJSON(x: any): x is GeoJSON {
  return x && x.type && types.indexOf(x.type) != -1
}
