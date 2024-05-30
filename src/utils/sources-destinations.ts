import { Source } from "@triplyetl/etl/generic";
import { getAccount, getDataset } from "./dtap.js";

const account = getAccount() == "me" ? undefined : getAccount();

export const destination = {
  vergunningscontroleservice: {
    account: account,
    dataset: {
      name: getDataset("vcs"),
      displayName: "Vergunningscontroleservice",
      description: "Gepubliceerd door TriplyETL",
    },
  },
  shacl_example: {
    account: account,
    dataset: {
      name: getDataset("shacl-example"),
      displayName: "SHACL Example",
      description: "Gepubliceerd door TriplyETL",
    },
  },
  geodata: {
    account: account,
    dataset: { name: getDataset("geodata"), displayName: "Geodata", description: "Gepubliceerd door TriplyETL" },
  },
};

export const source = {
  shacl_example_buildings: Source.file("static/example_data/shacl/mock_data_building.json"),
  shacl_example_model: Source.file("static/example_data/shacl/model.trig"),
  model: account
    ? Source.TriplyDb.asset(account, getDataset("vcs"), { name: "model.trig" })
    : Source.TriplyDb.asset(getDataset("vcs"), { name: "model.trig" }),
};
