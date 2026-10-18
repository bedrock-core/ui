#!/usr/bin/env node
import { checkReleaseVersions } from './release-versions.ts';

console.log(`release-versions: UI, runtime, and navigation are ${checkReleaseVersions()}.`);
