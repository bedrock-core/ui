#!/usr/bin/env node
import { checkReleaseVersions } from './release-versions.ts';

console.log(`release-versions: UI and runtime are ${checkReleaseVersions()}; navigation is independently versioned.`);
