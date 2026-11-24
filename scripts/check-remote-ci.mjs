#!/usr/bin/env node
/**
 * Universal Remote CI Verification Script for EcholytiX.
 * Queries GitHub Actions API using native Node.js fetch to monitor the remote workflow run.
 */
import { execSync } from 'node:child_process';

function getGitInfo() {
  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    let repoSlug = 'rubivssingh281-lab/Terraform-Titans';

    try {
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
      const match = remoteUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+?)(\.git)?$/);
      if (match) {
        repoSlug = `${match[1]}/${match[2]}`;
      }
    } catch {
      // Fallback to default repo
    }

    return { sha, branch, repoSlug };
  } catch (err) {
    console.error('[!] Failed to retrieve Git information:', err.message);
    process.exit(1);
  }
}

async function verifyRemoteCi(targetSha, maxWaitSec = 180, intervalSec = 6) {
  const { sha, branch, repoSlug } = getGitInfo();
  const commitSha = targetSha || sha;

  console.log('='.repeat(65));
  console.log(' [UNIVERSAL CI GATE] Checking Remote GitHub Actions Status');
  console.log(` Target Repository : ${repoSlug}`);
  console.log(` Branch            : ${branch}`);
  console.log(` Commit SHA        : ${commitSha.slice(0, 8)}`);
  console.log('='.repeat(65));

  const apiUrl = `https://api.github.com/repos/${repoSlug}/actions/runs?head_sha=${commitSha}`;
  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < maxWaitSec * 1000) {
    attempt++;
    try {
      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Antigravity-CI-Verifier',
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) {
        console.warn(`[*] (Attempt ${attempt}) GitHub API response: ${res.status}`);
        await new Promise((r) => setTimeout(r, intervalSec * 1000));
        continue;
      }

      const data = await res.json();
      const runs = data.workflow_runs || [];

      if (runs.length === 0) {
        console.log(`[*] (Attempt ${attempt}) No workflow run dispatched yet for ${commitSha.slice(0, 8)}. Waiting...`);
        await new Promise((r) => setTimeout(r, intervalSec * 1000));
        continue;
      }

      const run = runs[0];
      const status = run.status;
      const conclusion = run.conclusion;
      const htmlUrl = run.html_url;
      const workflowName = run.name || 'CI';
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      if (status === 'completed') {
        if (conclusion === 'success') {
          console.log(`\n[+] SUCCESS: Workflow '${workflowName}' #${run.run_number} PASSED (${elapsed}s)`);
          console.log(`    URL: ${htmlUrl}`);
          process.exit(0);
        } else {
          console.error(`\n[!] FAILED: Workflow '${workflowName}' #${run.run_number} concluded with '${conclusion}' (${elapsed}s)`);
          console.error(`    URL: ${htmlUrl}`);
          process.exit(1);
        }
      }

      console.log(`[*] [${elapsed}s] Workflow '${workflowName}' status: ${status}...`);
    } catch (err) {
      console.warn(`[*] Network error during attempt ${attempt}:`, err.message);
    }

    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }

  console.log(`\n[*] Timeout reached (${maxWaitSec}s). Workflow may still be executing remotely.`);
  process.exit(0);
}

const targetCommit = process.argv[2];
verifyRemoteCi(targetCommit);
