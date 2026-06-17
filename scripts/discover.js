#!/usr/bin/env node
import { runDiscovery } from '../src/discovery/run.js';

try {
  const result = await runDiscovery();
  console.log(`Discovery complete: ${result.newProjects.length} new projects for ${result.dateFound}`);
  for (const warning of result.warnings) {
    console.warn(`Warning: ${warning}`);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
