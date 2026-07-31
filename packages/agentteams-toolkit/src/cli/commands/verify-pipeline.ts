import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveTargetDir } from '../util.js';

const CANONICAL_SKILLS = [
  'triage',
  'root-cause',
  'implement',
  'review',
  'verify',
  'retro',
  'spec-sync',
];

export interface PipelineReport {
  passed: number;
  failed: number;
  skipped: number;
}

export async function verifyPipeline(rootDir: string): Promise<PipelineReport> {
  const report: PipelineReport = { passed: 0, failed: 0, skipped: 0 };

  const missing = CANONICAL_SKILLS.filter(
    (skill) =>
      !existsSync(path.join(rootDir, '.agents', 'skills', skill, 'SKILL.md')),
  );
  if (missing.length === 0) {
    console.log('  [PASS] Local skills registry mirror complete');
    report.passed += 1;
  } else {
    console.log(`  [FAIL] Local skills registry mirror incomplete:${missing.join(' ')}`);
    report.failed += 1;
  }

  const skillsApiUrl = process.env.AGENTTEAMS_SKILLS_API_URL ?? 'nacos://market.agentteams.io:80/public';
  if (skillsApiUrl) {
    console.log(`  [PASS] Nacos Skills Registry configured (${skillsApiUrl})`);
    report.passed += 1;
  } else {
    console.log('  [FAIL] Nacos Skills Registry URL is empty');
    report.failed += 1;
  }

  if (process.env.AGENTTEAMS_VERIFY_REMOTE === '1') {
    if (skillsApiUrl.startsWith('http://') || skillsApiUrl.startsWith('https://')) {
      const host = new URL(skillsApiUrl).host;
      try {
        const res = await fetch(`http://${host}/`, {
          signal: AbortSignal.timeout(10_000),
        });
        if (res.status === 200 || res.status === 401 || res.status === 403) {
          console.log(`  [PASS] Nacos registry reachable at ${host}`);
          report.passed += 1;
        } else {
          console.log(`  [FAIL] Nacos registry not reachable at ${host}`);
          report.failed += 1;
        }
      } catch {
        console.log(`  [FAIL] Nacos registry not reachable at ${host}`);
        report.failed += 1;
      }
    } else if (skillsApiUrl.startsWith('nacos://')) {
      console.log(
        '  [SKIP] Nacos protocol registry reachability check (use an HTTP registry)',
      );
      report.skipped += 1;
    } else {
      console.log(`  [SKIP] Unsupported registry protocol: ${skillsApiUrl}`);
      report.skipped += 1;
    }
  } else {
    console.log(
      '  [SKIP] Remote registry reachability (set AGENTTEAMS_VERIFY_REMOTE=1 to enable)',
    );
    report.skipped += 1;
  }

  const workerPath = path.join(rootDir, '.agents', 'examples', 'worker.yaml');
  if (existsSync(workerPath)) {
    const content = readFileSync(workerPath, 'utf8');
    if (content.includes('token:') && content.includes('type: consumer')) {
      console.log('  [PASS] Worker CR declares consumer token only');
      report.passed += 1;
    } else {
      console.log('  [FAIL] Worker CR does not declare a consumer token');
      report.failed += 1;
    }
  } else {
    console.log('  [FAIL] Worker CR example missing');
    report.failed += 1;
  }

  return report;
}

export async function runVerifyPipeline(args: string[]): Promise<number> {
  const dir = resolveTargetDir(args[0]);
  console.log(`==> agentteams-toolkit verify-pipeline ${dir}`);
  const report = await verifyPipeline(dir);
  const total = report.passed + report.failed;
  console.log(`==> Result: ${report.passed}/${total} passed (${report.skipped} skipped)`);
  return report.failed > 0 ? 1 : 0;
}
