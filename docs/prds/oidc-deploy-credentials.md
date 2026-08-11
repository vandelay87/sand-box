# PRD: OIDC Deploy Credentials & Dedicated Bucket

> Primary/detailed PRD: `per-app-buckets-and-oidc-deploy.md` in `akli-infrastructure`. Sibling companion PRDs: `oidc-deploy-credentials.md` in `personal-website` and `pokedex`. This PRD covers only Sand-box's own side of the migration.

## Overview

Move Sand-box's deploy workflow off the shared static AWS key and shared S3 bucket it currently uses, onto a dedicated `SandboxBucket` and a repo-scoped IAM Role assumed via GitHub OIDC — the same migration Pokedex and personal-website are also doing (see the primary PRD). This also fixes a real gap found in this repo's current workflow while its credentials step is already being rewritten: the deploy/invalidate steps have no branch guard, unlike Pokedex's equivalent workflow.

## Goals

- Deploys authenticate via OIDC (`role-to-assume`) instead of a static access key
- Deploys sync to a dedicated `SandboxBucket` instead of a prefix inside the shared site bucket
- Deploy/invalidate steps only run on pushes to `main`, not on every PR run
- The deployed app behaves identically — same URL (`akli.dev/apps/sand-box`), same build output, same `base: '/apps/sand-box/'` config (unchanged)

## Scope

**In scope:**
- `.github/workflows/deploy.yml`: swap the credentials step to OIDC, change the S3 sync target to the new dedicated bucket (same `apps/sand-box` key prefix, not bucket root), add the missing `if: github.ref == 'refs/heads/main'` guard to **all three** AWS steps — credentials, deploy, and invalidation
- Bootstrapping `docs/prds/` in this repo (this file, plus `template.md`) — this repo had no PRD convention before now

**Not in scope:**
- Any change to the app's own code, `vite.config.ts`, or `base` path
- The actual bucket/Role creation — that's `akli-infrastructure`'s CDK work (primary PRD)
- Subdomain migration (`sandbox.akli.dev`) — separate, future PRD
- Adding a test framework, CLAUDE.md, or other project conventions this repo currently lacks — out of scope for a deploy-credentials change

## Design

No UI — CI configuration only. No visible change to the deployed simulation.

## Technical Notes

- **Real bug found in the current workflow, and it's not just the deploy/invalidate steps**: `.github/workflows/deploy.yml` triggers on both `push` to `main` and `pull_request` to `main`, but unlike Pokedex's equivalent file, **none of the three AWS steps** here — `Configure AWS credentials`, `Deploy to S3 Sub-path`, `Invalidate CloudFront Sub-path` — have an `if: github.ref == 'refs/heads/main'` guard. All three need it, not just the two that touch S3/CloudFront: once this workflow moves to OIDC, an unguarded `Configure AWS credentials` step on a PR run would attempt `sts:AssumeRoleWithWebIdentity` using a non-`main` ref's OIDC token against a trust policy scoped to `ref:refs/heads/main` — that fails the PR job with an AWS auth error instead of just skipping cleanly. Since this file's credentials section is already being rewritten for OIDC, the guard is added to all three steps at the same time rather than left as a partial fix.
- **Sequencing dependency**: this only works once `akli-infrastructure`'s `SandboxDeployRole` and `SandboxBucket` actually exist — the primary PRD's CDK changes must be deployed first, and the new bucket populated with a deploy before CloudFront is repointed at it (this repo's job is step 1 of the primary PRD's migration sequence).
- `Configure AWS credentials` step (`aws-actions/configure-aws-credentials@v5`) changes from `aws-access-key-id`/`aws-secret-access-key` to `role-to-assume: <SandboxDeployRole ARN>`.
- **The workflow must add `permissions: id-token: write`** (at the job or workflow level) — without it, GitHub won't issue the OIDC token this step needs. Most common OIDC setup mistake, easy to miss. Add `permissions: contents: read` alongside it — declaring a `permissions:` block zeroes out every unlisted scope by default, which could otherwise starve `actions/checkout` of read access (low risk today since this repo is public, but worth setting explicitly).
- `Deploy to S3 Sub-path` step's target changes from `s3://${{ secrets.AWS_S3_BUCKET_NAME }}/apps/sand-box` (shared bucket) to `s3://<SandboxBucket>/apps/sand-box` — **the `apps/sand-box` prefix must be kept**, even though the new bucket is dedicated to this app alone. CloudFront's `apps/sand-box*` cache behavior forwards the full request path as the S3 object key; it does not strip the matched prefix before hitting the origin. Deploying to the new bucket's root instead would silently 403/404 once CloudFront is repointed at it. Update or replace the `AWS_S3_BUCKET_NAME` secret to point at the new bucket, but keep the `/apps/sand-box` suffix in the sync command.
- `CLOUDFRONT_ID` secret and the invalidation path (`/apps/sand-box/*`) are unchanged — still the one shared distribution. Note the bucket resource is named `sandbox` (no hyphen) on the AWS side even though this repo and its deployed path stay `sand-box`/`/apps/sand-box/` — a deliberate naming choice ahead of a possible future `sandbox.akli.dev` subdomain, not a mismatch to fix.
- `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` secrets are removed once the new workflow is verified.

## Acceptance Criteria

- [ ] `deploy.yml`'s AWS credentials step uses `role-to-assume`, no static key inputs
- [ ] The workflow declares `permissions: id-token: write` and `permissions: contents: read`
- [ ] `Deploy to S3 Sub-path` step targets the new dedicated `SandboxBucket`, still under the `apps/sand-box` key prefix (not bucket root — see Technical Notes for why)
- [ ] All three AWS steps — credentials, deploy, and invalidation — only run `if: github.ref == 'refs/heads/main'` (fixes the current PR-triggered deploy-attempt bug, which affects all three, not just the two touching S3/CloudFront)
- [ ] A real deploy run (push to `main`) succeeds: build, S3 sync, and CloudFront invalidation all complete
- [ ] A PR run builds only — no AWS credential/deploy/invalidation steps execute
- [ ] `https://akli.dev/apps/sand-box` serves correctly after the CloudFront behavior is repointed (per the primary PRD's cutover steps)
- [ ] `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` secrets are removed from this repo after verification
