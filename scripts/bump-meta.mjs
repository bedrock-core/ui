#!/usr/bin/env node
import { syncMetaVersion } from './release-versions.ts';

const { previous, version, changed } = syncMetaVersion();

console.log(changed
  ? `bump-meta: @bedrock-core/ui ${previous} -> ${version}, matching runtime.`
  : `bump-meta: @bedrock-core/ui already ${version}.`);
