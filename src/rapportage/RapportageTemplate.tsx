import * as crypto from 'crypto'
import { readFile } from 'fs/promises'
import { Feature, FeatureCollection, GeoJSON, Geometry } from 'geojson'
import grapoi from 'grapoi'
import React, { Fragment } from 'react'

import { dct, geo, litre, prov, rdf, rdfs, skos } from '@helpers/namespaces.js'
import { NamespaceBuilder } from '@rdfjs/namespace'
import { Controle } from '@root/core/Controle.js'
import { GrapoiPointer } from '@root/core/helpers/grapoi.js'
import { isFeature, isFeatureCollection, isPolygon, isMultiPolygon } from '@root/core/helpers/isGeoJSON.js'
import { wktToGeoJSON } from '@terraformer/wkt'
import { Store as TriplyStore } from '@triplydb/data-factory'

export type RapportageProps = {
  baseIRI: string
  datasetName: string
  elongation: number
  footprint: any
  footprintUrl: string
  gebouw: string
  gebouwAddress: string
  glbDownload: string
  gltfDownload: string
  rpt: NamespaceBuilder
}

const inlineScript = await readFile('./src/rapportage/inlineScript.js')

function ElongationExplanation() {
  return (
    <details>
      <summary>Uitleg</summary>
      <p>
        De langwerpigheid van de voetafdruk van het gebouw wordt uitgedrukt in het getal L. L wordt bepaald aan de hand
        van de verhouding tussen oppervlakte en omtrek van de voetafdruk, en is onafhankelijk van de vorm van de
        voetafdruk. Hieronder een overzicht van waarden voor L voor rechthoeken met oplopende langwerpigheid:
      </p>
      <div className="elongation-example">
        <table>
          <tr>
            <td></td>
            <td>L=1</td>
          </tr>
        </table>
      </div>

      <div className="elongation-example">
        <table>
          <tr>
            <td></td>
            <td></td>
            <td>L=0,9428</td>
          </tr>
        </table>
      </div>

      <div className="elongation-example">
        <table>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>L=0,8660</td>
          </tr>
        </table>
      </div>

      <div className="elongation-example">
        <table>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>L=0,7454</td>
          </tr>
        </table>
      </div>

      <div className="elongation-example">
        <table>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>L=0,5750</td>
          </tr>
        </table>
      </div>
    </details>
  )
}

function ProvenanceHtml(provenancePointer: GrapoiPointer, rpt: NamespaceBuilder) {
  // const parts = provenancePointer.out(dct('hasPart'))
  const startTime = provenancePointer.out(prov('startedAtTime')).value
  const endTime = provenancePointer.out(prov('endedAtTime')).value
  const sparqlUrl = provenancePointer.out(rpt('sparqlUrl')).value
  const apiResponse = provenancePointer.out(rpt('apiResponse')).value
  const apiCall = provenancePointer.out(rpt('apiCall')).value
  const prefLabel = provenancePointer.out(skos('prefLabel')).value
  const description = provenancePointer.out(dct('description')).value
  return (
    <details key={provenancePointer.value}>
      <summary>Provenance {prefLabel ?? provenancePointer.value}</summary>
      <dl>
        {description && (
          <>
            <dt>Beschrijving</dt>
            <dd>{description}</dd>
          </>
        )}
        {startTime && (
          <>
            <dt>Starttijd</dt>
            <dd>{startTime}</dd>
          </>
        )}
        {endTime && (
          <>
            <dt>Eindtijd</dt>
            <dd>{endTime}</dd>
          </>
        )}
        {apiCall && (
          <>
            <dt>API-verzoek</dt>
            <dd>
              <a href={typeof apiCall == 'number' ? 'about:blank' : apiCall}>{apiCall}</a>
            </dd>
          </>
        )}
        {apiResponse && (
          <>
            <dt>API-respons</dt>
            <dd>
              <pre>{apiResponse}</pre>
            </dd>
          </>
        )}
        {sparqlUrl && (
          <>
            <dt>SPARQL query</dt>
            <dd>
              <a href={typeof sparqlUrl == 'number' ? 'about:blank' : sparqlUrl}>{sparqlUrl}</a>
            </dd>
          </>
        )}
      </dl>
    </details>
  )

  // { {parts.map((part: GrapoiPointer) => ProvenanceHtml(part, rpt))}
}

// Find all georef content from this controle and add to the map if there are any
function Map({ controle }: { controle: Controle<any, any> }) {
  function getFeatures(c: Controle<any, any>): Feature[] {
    const features = Object.entries(c.info).flatMap(([_, v]) =>
      isFeatureCollection(v) ? v.features : isFeature(v) ? [v] : [],
    )
    return c.parent ? features.concat(getFeatures(c.parent)) : features
  }

  const features: Feature[] = getFeatures(controle)
  const mapID = crypto.createHash('md5').update(controle.name.toString()).digest('hex')

  if (features.length) {
    // Determine starting view. For now, just pick the first coordinates of the last feature
    let coords = [51.3, 4.9]
    const geom = features[features.length - 1].geometry
    if (isPolygon(geom)) {
      coords = geom.coordinates[0][0]
    } else if (isMultiPolygon(geom)) {
      coords = geom.coordinates[0][0][0]
    }

    return (
      <>
        <div id={mapID} style={{ height: '300px', width: '600px', float: 'right' }}></div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
const m${mapID} = L.map('${mapID}').setView([${coords[1]}, ${coords[0]}], 20);
const tiles${mapID} = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});
tiles${mapID}.addTo(m${mapID});
L.geoJSON(${JSON.stringify(features)}, {onEachFeature}).addTo(m${mapID});
makeLegend().addTo(m${mapID});
`,
          }}
        ></script>
      </>
    )
  }
  return <></>
}

function Icon({ status }: { status: boolean | null | undefined }) {
  if (status === true) return '✅'
  if (status === false) return '❌'
  if (status === null) return '⭕'
  return ''
}

function ControleDiv({
  controle,
  rpt,
  depth,
}: {
  controle: Controle<any, any>
  rpt: NamespaceBuilder
  depth?: number
}) {
  if (!depth) depth = 0
  const subcontroles = controle.children
  const label = controle.name
  const info = controle.info
  const provenance = controle.activity
  if (!provenance) throw new Error('should be known')

  return (
    <div
      key={controle.name.toString()}
      id={controle.name.toString()}
      style={
        depth > 0
          ? { border: '2px dashed #bbbbbb', margin: '15px 5px', padding: '5px', overflow: 'auto', clear: 'both' }
          : {}
      }
    >
      <Map controle={controle} />
      <h3 className={controle.status === false ? 'bg-danger-subtle' : ''}>
        <Icon status={controle.status} /> {label}
      </h3>
      <dl>
        {Object.entries(info).map(([k, v]) => {
          if (typeof v == 'number') {
            return (
              <Fragment key={k}>
                <dt>{k}</dt>
                <dd>
                  {v.toString().replace('.', ',')}
                  {k == 'Langwerpigheid' ? ElongationExplanation() : ''}
                </dd>
              </Fragment>
            )
          } else if (typeof v == 'string') {
            return (
              <Fragment key={k}>
                <dt>{k}</dt>
                <dd dangerouslySetInnerHTML={{ __html: v }} />
              </Fragment>
            )
          } else if (!isFeature(v) && !isFeatureCollection(v)) {
            return (
              <Fragment key={k}>
                <dt>{k}</dt>
                <dd>
                  <a href={v.url} target="_blank">
                    {v.text}
                  </a>
                </dd>
              </Fragment>
            )
          } else return null
        })}
      </dl>
      {ProvenanceHtml(provenance, rpt)}
      {subcontroles.map((c, index) => (
        <ControleDiv key={index} controle={c} rpt={rpt} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function (
  {
    gebouw,
    footprint,
    footprintUrl,
    datasetName,
    baseIRI,
    gltfDownload,
    glbDownload,
    gebouwAddress,
    elongation,
    rpt,
  }: RapportageProps & { rpt: NamespaceBuilder },
  controle: Controle<any, any>,
  provenanceDataset: TriplyStore,
  idsControle: GrapoiPointer,
) {
  const validationPointer = controle.pointer
  const ifc = validationPointer.out(rpt('ifc'))
  const gitRev = validationPointer.out(rpt('gitRevision'))
  const idsFiles = idsControle.out(rdfs('seeAlso'))
  const date = new Date().toISOString().split('T')[0]

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`Vergunningscontrolerapport ${datasetName} van ${date}`}</title>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin=""
        ></script>

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
                footprint,
              },
              null,
              2,
            ),
          }}
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});
function onEachFeature(feature, layer) {
  if (feature.properties) {
    if (feature.properties.name) {
      layer.bindPopup(feature.properties.name);
    }
    if (feature.properties.style) {
      layer.setStyle(feature.properties.style);
    }
  }
};
function makeLegend(){
  var legend = L.control({position: "bottomright"});
  legend.onAdd = function(map) {
    const features = [];
    map.eachLayer((l) => {
      if (l.feature)
        features.push(l.feature);
    })
    var div = L.DomUtil.create('div', 'legend');
    for(const f of features) {
      var props = f.properties;
      var name = props.name;
      var style = props.style;
      var color = style ? style.color : "#3388ff";
      div.innerHTML += '<i style="background:' + color + '"></i> ' + name + '<br>';
    }
    return div;
  }
  return legend;
}
`,
          }}
        ></script>
        <style>{`
.legend {
  line-height: 18px;
  color: #555;
  background-color: #ffffffaa;
  border: 1px solid #555;
  border-radius: 5px;
  padding: 5px;
}
.legend i {
  width: 16px;
  height: 16px;
  float: left;
  margin: 1px 8px 1px 0px;
}
.article-ref {
  font-weight: bold;
  text-decoration: underline;
}
.elongation-example table {
  border-collapse: collapse;
  margin: 5px 3px;
}
.elongation-example td {
  width: 35px;
  height: 35px;
  border-left: 1px dashed grey;
  border-top: 2px solid black;
  border-bottom: 2px solid black;
}
.elongation-example td:first-child {
  border-left: 2px solid black;
}
.elongation-example td:last-child {
  border-left: 2px solid black;
  border-top: none;
  border-bottom: none;
  padding-left: 10px;
}
`}</style>
      </head>
      <body className="p-5">
        <img src="https://www.rotterdam.nl/images/logo-base.svg" style={{ float: 'right' }} />
        <h1>Vergunningscontrolerapport van {date}</h1>
        <dl>
          <dt>Revision</dt>
          <dd>
            <pre>{gitRev.value}</pre>
          </dd>
          <dt>Adres</dt>
          <dd>{gebouwAddress}</dd>
          <dt>Dataset</dt>
          <dd>
            <a href={baseIRI} target="_blank">
              {baseIRI}
            </a>
          </dd>
          <dt>Voetafdruk</dt>
          <dd>
            <a href={footprintUrl} target="_blank">
              {footprintUrl}
            </a>
          </dd>
          <dt>3D model met bestemmingsvlakken</dt>
          <dd>
            <a
              href="https://demo.triplydb.com/rotterdam/-/queries/3D-Visualisation-with-background-map"
              target="_blank"
            >
              https://demo.triplydb.com/rotterdam/-/queries/3D-Visualisation-with-background-map
            </a>
          </dd>
          <dt>Downloads</dt>
          <dd>
            <div>
              Alle assets:{' '}
              <a href={baseIRI + 'assets'} target="_blank">
                {baseIRI}Assets
              </a>
            </div>
            <div>
              ⬇ 3D-model: <a href={gltfDownload}>{gltfDownload.split('fileName=')[1]}</a>{' '}
              <a href={glbDownload}>{glbDownload.split('fileName=')[1]}</a>
            </div>
            <div>
              ⬇ IFC-bestand: <a href={ifc.value.toString()}>{ifc.value.toString().split('fileName=')[1]}</a>
            </div>
            ⬇ IDS-controle:
            {idsFiles.map((file) => (
              <React.Fragment key={file.value}>
                {' '}
                <a href={file.value.toString()}>{file.value.toString().split('fileName=')[1]}</a>
              </React.Fragment>
            ))}
          </dd>
        </dl>

        <ControleDiv controle={controle} rpt={rpt} />

        <script type="module" dangerouslySetInnerHTML={{ __html: inlineScript }}></script>
      </body>
    </html>
  )
}
