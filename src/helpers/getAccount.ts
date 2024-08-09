import { environments, Etl } from '@triplyetl/etl/generic'

/**
 * DTAP setup
 * ----------
 *
 * | Environment   | Account              | Main VCS Dataset | Building Dataset     |
 * |---------------+----------------------+------------------+----------------------|
 * | [D]evelopment | USER                 | vcs              | [building-timestamp] |
 * | [T]esting     | rotterdam-testing    | vcs              | [building-timestamp] |
 * | [A]cceptance  | rotterdam-acceptance | vcs              | [building-timestamp] |
 * | [P]roduction  | rotterdam            | vcs              | [building-timestamp] |
 */

export function getAccount(): string | undefined {
  if (Etl.environment === environments.Development) {
    return undefined
  } else if (Etl.environment === environments.Production) {
    return 'rotterdam'
  } else {
    return `rotterdam-${Etl.environment.toLowerCase()}`
  }
}
