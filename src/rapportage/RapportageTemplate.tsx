import { readFile } from 'fs/promises'
import { rpt, rdfs, prov } from '@helpers/namespaces.js'
import { GrapoiPointer } from '@root/core/helpers/grapoi.js'

export type RapportageProps = {
  gebouw: string
  polygon: any
  geoData: any
  gltfUrl: string
}

const inlineScript = await readFile('./src/rapportage/inlineScript.js')

function Controle(controle: any) {
  const label = controle.out(rdfs('label')).value
  const validated = controle.out(rpt('passed')).value === 'true'
  const message = controle.out(rpt('message')).value
  //const prov = controle.out(prov('wasGeneratedBy')).out(prov('startedAtTime')).value
  return (
    <div key={label}>
      <h1 className={!validated ? 'bg-danger-subtle' : ''}>
        {validated ? <strong>✅</strong> : <strong>❌</strong>}
        {label}
      </h1>
      <p>{message}</p>
      <hr />
    </div>
  )
}

export default function ({ gebouw, polygon, geoData, gltfUrl }: RapportageProps, validationPointer: GrapoiPointer) {
  const controles = validationPointer.out(rpt('controle'))

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`Validatierapportage ${gebouw}`}</title>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.5.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.5.1/dist/leaflet-src.js"></script>

        <script src="https://unpkg.com/proj4@2.5.0/dist/proj4-src.js"></script>
        <script src="https://unpkg.com/proj4leaflet@1.0.1"></script>

        <script src="https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Cesium.js"></script>

        <link
          href="https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Widgets/widgets.css"
          rel="stylesheet"
        />
        <script src="https://unpkg.com/proj4@2.5.0/dist/proj4-src.js"></script>
        <script src="https://unpkg.com/proj4leaflet@1.0.1"></script>

        <script
          type={'application/json'}
          id="data"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              {
                polygon,
                geoData,
                gltfUrl,
              },
              null,
              2,
            ),
          }}
        ></script>
      </head>
      <body className="p-5">
        <h1>VCS Validatierapportage</h1>
        <h2>{gebouw}</h2>

        <div style={{ height: 880 }} id="cesiumContainer"></div>

        {controles.map((controle: GrapoiPointer) => Controle(controle))}

        <script type="module" dangerouslySetInnerHTML={{ __html: inlineScript }}></script>
      </body>
    </html>
  )
}
