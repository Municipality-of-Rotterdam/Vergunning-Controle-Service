import { readFile } from 'fs/promises'

export type RapportageProps = {
  gebouw: string
  polygon: any
  geoData: any
  gltfUrl: string
  controles: {
    label: string
    validated: boolean
    message?: string
  }[]
}

const inlineScript = await readFile('./src/rapportage/inlineScript.js')

export default function ({ gebouw, controles, polygon, geoData, gltfUrl }: RapportageProps) {
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

        <table className="table">
          <thead>
            <tr>
              <th scope="col">Controle</th>
              <th scope="col">Status</th>
              <th scope="col">Bericht</th>
            </tr>
          </thead>
          <tbody>
            {controles.map((controle) => (
              <tr key={controle.label}>
                <td>{controle.label}</td>
                <td>{controle.validated ? <strong>✅</strong> : <strong>❌</strong>}</td>
                <td className={!controle.validated ? 'bg-danger-subtle' : ''}>{controle.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <script type="module" dangerouslySetInnerHTML={{ __html: inlineScript }}></script>
      </body>
    </html>
  )
}
