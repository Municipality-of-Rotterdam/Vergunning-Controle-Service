import { Source } from "@triplyetl/etl/generic";
import { getAccount, getDataset } from "./dtap.js";

export const destination = {
  vergunningscontroleservice: {
    account: getAccount(),
    dataset: {
      name: getDataset("vcs"),
      displayName: "Vergunningscontroleservice",
      description: "Gepubliceerd door TriplyETL",
    },
  },
};

export const source = {
  model: Source.file("data/model.trig"),
};
