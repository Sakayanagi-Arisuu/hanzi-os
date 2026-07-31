// Authoring scopes are immutable planning snapshots. Runtime releases may add
// lesson mappings or change package versions without invalidating every HSK
// draft derived from an otherwise unchanged level plan. Current graph
// compatibility is still checked structurally by each scope validator.
const AUTHORING_GRAPH_SHA256_BY_PATH = Object.freeze({
  hsk1: "sha256:d9f059e375ed30b512365974b7c52b218bd2ccd991fc26942d2f38c59e48e474",
  hsk2: "sha256:d9f059e375ed30b512365974b7c52b218bd2ccd991fc26942d2f38c59e48e474",
  hsk3: "sha256:d9f059e375ed30b512365974b7c52b218bd2ccd991fc26942d2f38c59e48e474",
  hsk4: "sha256:d9f059e375ed30b512365974b7c52b218bd2ccd991fc26942d2f38c59e48e474",
});

export const authoringGraphSha256ForPath = (pathId) => {
  const sha256 = AUTHORING_GRAPH_SHA256_BY_PATH[pathId];
  if (!sha256) throw new Error(`Unknown HSK authoring path: ${String(pathId)}`);
  return sha256;
};
