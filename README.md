# Vergunning Controle Service (VCS) 

[In Dutch]

Vergunning Controle Service is een digitale ondersteuning om ingediende BIM-modellen, in combinatie met een Digitale Stad, te toetsen op de geldende regels (bijvoorbeeld omgevingsplannen, constructie, veiligheid, geluid, etc).  
Met een druk op de knop ziet een toetsende partij of een toekomstige werkelijkheid van de omgeving voldoet aan de afspraken.  

Om te mogen bouwen is een omgevingsvergunning van de gemeente nodig. Hiervoor levert de ontwikkelaar vaak veel documenten en tekeningen aan, die een gemeentemedewerker bekijkt en beoordeelt. Het controleren van alle documenten is een tijdrovend proces. Het uitzoekwerk verloopt veelal handmatig en is een arbeidsintensief proces. Met de Omgevingswet (OW) is er minder tijd voor controle, waarbij de VCS helpt om de termijnen te halen. 

Het doel van deze software is het uitvoeren van controles op de IFC van gebouwen.
- Controle groep, een groep van controles. Een controle groep bestaat uit: `voorbereiding`, `controles`.
- Controle, een controle voor een specifieke regel. Een controle bestaat uit: `voorbereiding`, `sparql`.

De VCS is initieel ontwikkeld in opdracht van Gemeente Rotterdam, door Triply. Om andere gemeenten te helpen wordt hier de kennis gedeeld. Gemeente Rotterdam draagt geen enkele verantwoordelijkheid voor de werking van de code en onderhoudt de code niet (ook geen bug fixing). Op deze initiele versie wordt door Rotterdam nog wel een doorontwikkeling gedaan en op later moment hier gepubliceerd.   

## Prerequisites

This script is used to conduct the Vergunning Controle Service for the Municipality of Rotterdam. In this repository we use command line executables, python scripts, and java jar scripts to transform the IFC data into linked data.

To be able to run code from this repository it is required to have:

- NodeJs installed: https://nodejs.org/en
- Python version 3.12 installed (at least a type supported version), with working `python3` as CLI command: https://www.python.org/
- Java installed: https://www.java.com/en/download/
- docker: https://docs.docker.com/get-docker/

### Create a TriplyDB API Token

Your TriplyDB API Token is your access key to TriplyDB. You can create one in TriplyDB using [this instruction](https://triply.cc/docs/api-token) or you can type (and follow the onscreen instructions):

```sh
npx tools create-token
```

Once you have your token, open the file `.env` and write the following line:
`TRIPLYDB_TOKEN=<your-token-here>`

### Ruimtelijke Plannen token

You also need `RP_API_TOKEN`. You can find it in the GitLab CI environment settings.

### Input: IFC file

The IFC file that will be checked needs to be uploaded as an asset to the `vcs` dataset of the respective DTAP environment. See for example here: https://demo.triplydb.com/rotterdam/vcs/assets. This way, we can integrate the application with the DSO, and trigger a web hook to run the application every time a new IFC file from the DSO is uploaded.

### Running the application

You can run the application with the following commands:

```sh
npm i
npm run build
node lib/main.js --ifc="Kievitsweg_R23_MVP_IFC4.ifc" --clean
```

It might be necessary to work within a virtual environment. To do so, use these commands:

On POSIX using Bash:

```sh
python3 -m venv myenv && source myenv/bin/activate
```

On Windows using Powershell:

```sh
python3 -m venv myenv && .\myenv\Scripts\activate
```

### Output: vcs-rapport.html

The output of the VCS application is the report, called `vcs-rapport.html`. This is added as an asset to the respective building dataset. See for example here: https://demo.triplydb.com/rotterdam/KievitswegRMVPIFC/assets.

## Development of checks

[In Dutch]

Het doel van deze software is het uitvoeren van controles op de IFC van gebouwen.

- Controle groep, een groep van controles. Een controle groep bestaat uit: `voorbereiding`, `controles`.
- Controle, een controle voor een specifieke regel. Een controle bestaat uit: `voorbereiding`, `sparql`.

## 4. DTAP Environments

This pipeline can be run in different modes (also called `ENV`s), following the so called [DTAP](https://en.wikipedia.org/wiki/Development,_testing,_acceptance_and_production) approach:

<dl>
  <dt>Development</dt>
  <dd>Personal development run when working on a local computer.  Make sure to run the pipeline frequently; this allows you to spot mistakes early on.</dd>
  <dt>Testing</dt>
  <dd>A full 'real' run, which might be run using a new `testing` branch. </dd>
  <dt>Acceptance</dt>
  <dd>A full 'real' run, but not a production run yet, using the `acceptance` branch.</dd>
  <dt>Production</dt>
  <dd>A full run that overwrites the officially published version of the data, using the `main` branch.</dd>
</dl>

By default your environment on your local computer is `development`. ON the Gitlab pipelines the environment is set in the [schedule configuration](https://git.triply.cc/customers/gemeenterotterdam/vergunningscontroleservice/-/pipeline_schedules), by setting a variable `ENV`.

The datasets are created in thesese TriplyDB accounts/organisations bases on the environment:

| `ENV`         | Account                                          |
| ------------- | ------------------------------------------------ |
| `development` | <https://demo.triplydb.com/me>                   |
| `testing`     | <https://demo.triplydb.com/rotterdam-testing>    |
| `acceptance`  | <https://demo.triplydb.com/rotterdam-acceptance> |
| `production`  | <https://demo.triplydb.com/rotterdam>            |
