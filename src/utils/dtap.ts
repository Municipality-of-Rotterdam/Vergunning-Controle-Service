// This file defines the account name and dataset name for this project.
// These names are used to implement the DTAP approach for this project.

import { Etl, environments } from '@triplyetl/etl/generic'

export function get_account (): string {
  switch (Etl.environment) {
    case environments.Development:
      return 'me'
    case environments.Testing:
    case environments.Acceptance:
    case environments.Production:
      return 'vergunningscontroleservice'
    default:
      throw new Error('Unanticipated DTAP environment.')
  }
}

export function get_dataset (name: string): string {
  switch (Etl.environment) {
    case environments.Development:
      return name
    case environments.Testing:
      return `${name}-testing`
    case environments.Acceptance:
      return `${name}-acceptance`
    case environments.Production:
      return name
    default:
      throw new Error('Unanticipated DTAP environment.')
  }
}
