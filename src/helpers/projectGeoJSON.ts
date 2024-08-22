import { GeoJSON, Geometry } from 'geojson'
import proj4 from 'proj4'

import { isGeometryCollection, isMultiPolygon, isPolygon } from './isGeoJSON.js'

/* Instead of inlining the following on a webpage containing a Leaflet box: 
 *    L.geoJSON(features, {coordsToLatLng: (c) => RD.unproject(L.point(c[0], c[1]))).addTo(map);

... We do the projection server-side, because Leaflet doesn't support multiple CRSes
*/

export const epsg28992: proj4.Converter = proj4(
  '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs',
)

export function projectGeoJSON(source: GeoJSON, conv = epsg28992): GeoJSON {
  if (!source) throw new Error(`source evaluates to false`)
  const g = Object.assign({}, source)
  if (isGeometryCollection(g)) {
    g.geometries = g.geometries.map((y) => projectGeoJSON(y, conv) as Geometry)
  } else if (isPolygon(g)) {
    g.coordinates = g.coordinates.map((y) => y.map(conv.inverse))
  } else if (isMultiPolygon(g)) {
    g.coordinates = g.coordinates.map((y) => y.map((z) => z.map(conv.inverse)))
  } else {
    throw new Error(`Projection of GeoJSON type ${g.type} has not been implemented`)
  }
  return g
}
