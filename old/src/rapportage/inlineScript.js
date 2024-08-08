var RD = new L.Proj.CRS(
  'EPSG:28992',
  '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs',
  {
    origin: [-285401.92, 903401.92],
    resolutions: [
      3251.206502413005, 1625.6032512065026, 812.8016256032513, 406.40081280162565, 203.20040640081282,
      101.60020320040641, 50.800101600203206, 25.400050800101603, 12.700025400050801, 6.350012700025401,
      3.1750063500127004, 1.5875031750063502, 0.7937515875031751, 0.39687579375158755, 0.19843789687579377,
      0.09921894843789689, 0.04960947421894844,
    ],
  },
)

const data = JSON.parse(document.querySelector('#data').innerHTML)

const center = RD.projection.unproject({ x: data.geoData.Delta_X, y: data.geoData.Delta_Y })

const viewer = new Cesium.Viewer('cesiumContainer', {
  infoBox: false,
  selectionIndicator: false,
  shadows: false,
  shouldAnimate: false,
})

viewer.entities.removeAll()

const position = Cesium.Cartesian3.fromDegrees(center.lng, center.lat, data.geoData.Height)
const heading = data.geoData.Rotation + 0.75 * Math.PI
const pitch = 0
const roll = 0
const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll)
const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr)

const entity = viewer.entities.add({
  name: data.gltfUrl,
  position,
  orientation,
  viewFrom: new Cesium.Cartesian3(0, 0, 500),
  model: {
    uri: data.gltfUrl,
    minimumPixelSize: 128,
    maximumScale: 20000,
  },
})

viewer.trackedEntity = entity
