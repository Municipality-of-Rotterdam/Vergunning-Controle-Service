# Triply ETL for GemeenteRotterdam

## Prerequisites

This script is used to conduct the Vergunning Controle Service for the municipality of Rotterdam. In this repository we use command line executables, python scripts, and java jar scripts to transform the IFC data into linked data.

To be able to run code from this repository it is required to have:

- NodeJs installed: https://nodejs.org/en
- Python version 3.12 installed (at least a type supported version), with working `python3` as CLI command: https://www.python.org/
- Java installed: https://www.java.com/en/download/
- docker: https://docs.docker.com/get-docker/

It might be necessary to work within a virtual environment. Use these commands:

```
python3 -m venv myenv
source myenv/bin/activate
```

### Create a TriplyDB API Token

Your TriplyDB API Token is your access key to TriplyDB. You can create one in TriplyDB using [this instructions](https://triply.cc/docs/api-token) or you can type (and follow the onscreen instructions):

```sh
npx tools create-token
```

Once you have your token, open the file `.env` and write the following line:
`TRIPLYDB_TOKEN=<your-token-here>`

### Ruimtelijke Plannen token

You also need `RP_API_TOKEN`. You can find it in the GitLab CI environment settings.

## Development of checks

[In Dutch]

Het doel van deze software is het uitvoeren van controles op de IFC van gebouwen.

- Controle groep, een groep van controles. Een controle groep bestaat uit: `voorbereiding`, `controles`.
- Controle, een controle voor een specifieke regel. Een controle bestaat uit: `voorbereiding`, `sparql`.
