import { execWithProvenance } from '@root/provenance/execWithProvenance.js';

export const getGitRevision = async () => {
  // In the CI there is no GIT.
  if (process.env['CI_COMMIT_SHA']) return process.env['CI_COMMIT_SHA']
  const { stdout: revision } = await execWithProvenance('git rev-parse HEAD')
  return revision
}
