# PRD: Subdomain Migration

> Primary/detailed PRD: `subdomain-per-app-migration.md` in `akli-infrastructure`. Sibling companion PRDs: `subdomain-migration.md` in `personal-website` and `pokedex`. This PRD covers only Sand-box's own side of the migration.

## Overview

Move Sand-box from `akli.dev/apps/sand-box` to its own dedicated subdomain, `sandbox.akli.dev` (no hyphen — matches the `SandboxBucket` naming already established in PRD #1, anticipating this exact move), served by a new dedicated CloudFront distribution (`SandboxSiteStack` in `akli-infrastructure`) instead of a path pattern on the shared site distribution.

## Goals

- The app is built and deployed to serve correctly from a subdomain root instead of a `/apps/sand-box/` subpath
- Deploys sync to `SandboxBucket`'s root instead of the `apps/sand-box` prefix used since PRD #1
- No functional change to the app's own simulation code or behavior — same build output, same behavior, only where it's hosted (and its `<head>` metadata) changes
- The app has a proper web app manifest and favicon, so it reads as a real, dedicated destination at `sandbox.akli.dev` rather than a subpath of the portfolio site — closing a gap that didn't matter under the old path-based setup (a subpath of `personal-website`, which already carries its own `site.webmanifest`, didn't need its own)

## Scope

**In scope:**
- `vite.config.ts`: `base` changes from `'/apps/sand-box/'` to `/` (Vite's default)
- `.github/workflows/deploy.yml`: S3 sync target changes from `s3://<SandboxBucket>/apps/sand-box` to `s3://<SandboxBucket>` (root); CloudFront invalidation path/distribution ID changes from the shared distribution's `/apps/sand-box/*` to the new dedicated distribution's `/*`
- Add a web app manifest (`public/manifest.json` or `site.webmanifest`) with `name`, `short_name`, and at least one icon, linked from `index.html` via `<link rel="manifest">`
- Replace the current placeholder `<link rel="icon" ... href="/vite.svg">` with a real Sand-box-specific favicon

**Not in scope:**
- Any change to the app's own simulation code or runtime behavior — the manifest/favicon work is static assets and `<head>` metadata only, not simulation logic
- The actual `SandboxSiteStack`/certificate/DNS creation — that's `akli-infrastructure`'s CDK work (primary PRD)
- Redirecting the old `akli.dev/apps/sand-box` URL — explicitly not happening, per the primary PRD's Non-Goals

## Design

No UI — build config and CI configuration only. Visually and functionally identical simulation, served from a different URL.

## Technical Notes

- **Sequencing dependency**: `akli-infrastructure`'s Deploy A (new `SandboxSiteStack`, `SandboxCert`) must land first. Per the primary PRD's migration sequence, this repo's redeploy is verified against the distribution's default `*.cloudfront.net` hostname first — DNS for `sandbox.akli.dev` is already live from Deploy A onward (there's no separate "DNS cutover" step in this migration, unlike a traditional blue/green DNS switch), so verification proceeds straight from the `*.cloudfront.net` hostname to the real subdomain once confirmed. This all happens well before the old shared-distribution behavior is removed — the old `akli.dev/apps/sand-box` URL keeps working throughout.
- `vite.config.ts`'s `base: '/apps/sand-box/'` → `base: '/'` (or remove the option). Getting this wrong breaks asset loading under the new root-based distribution.
- `Deploy to S3 Sub-path` step's target changes from `s3://${{ secrets.AWS_S3_BUCKET_NAME }}/apps/sand-box` to `s3://${{ secrets.AWS_S3_BUCKET_NAME }}` — bucket root. Note this is the *opposite* direction from the fix applied in PRD #1 (where the `apps/sand-box` prefix had to be kept because the old shared distribution forwarded the full request path) — don't reflexively re-apply that earlier lesson here, it inverts once the app has its own dedicated distribution.
- **Real gap caught in review**: the existing command uses `--delete`, which with no prefix on a bucket-root sync scopes its delete-comparison to the *entire bucket* — run as-is, the first bucket-root redeploy would delete the still-live `apps/sand-box/` content the *old* shared distribution is still serving, 404ing the old URL immediately instead of at the deliberate step-6 cleanup in the primary PRD. Add `--exclude "apps/sand-box/*"` to the sync command until that step 6 explicitly removes the prefix (then drop the exclude) — mirrors the same technique `personal-website`'s own `deploy.yml` already uses to protect other apps' prefixes.
- CloudFront invalidation step's `--distribution-id` changes to the new `SandboxSiteStack` distribution's ID, path changes from `/apps/sand-box/*` to `/*`.
- The `AWS_S3_BUCKET_NAME`/`CLOUDFRONT_ID` secret values are updated to point at the new distribution once it exists; names stay the same.
- The `if: github.ref == 'refs/heads/main'` guard added to all three AWS steps in PRD #1's migration (a real pre-existing bug fixed there — see that repo's PRD #1 companion) stays in place and doesn't need to change here.
- No change expected to `SandboxDeployRole`'s IAM permissions from PRD #1 (scoped to the whole `SandboxBucket` ARN, not a specific prefix) — confirm this holds once PRD #1 is actually implemented, same caveat as the Pokedex companion PRD.
- **Manifest/favicon**: `public/` today only has the default Vite `vite.svg`, no manifest. `index.html` already carries a `<meta name="description">` for the simulation, which the manifest doesn't replace — the manifest is separate browser-chrome/installability metadata (`name`, `short_name`, `icons`), not a duplicate of that description. Keep it minimal, matching `personal-website`'s `site.webmanifest` shape (`name`, `short_name`, one `icons` entry) — this isn't a PWA installability initiative, just correct browser chrome and link-preview metadata for a standalone origin.

## Acceptance Criteria

- [ ] `vite.config.ts`'s `base` is `/` (or unset)
- [ ] `Deploy to S3 Sub-path` step targets `SandboxBucket`'s root, not the `apps/sand-box` prefix, with `--exclude "apps/sand-box/*"` added so the redeploy's `--delete` doesn't wipe the still-live old prefix before the primary PRD's step 6 cleanup runs
- [ ] CloudFront invalidation targets the new `SandboxSiteStack` distribution's ID with path `/*`
- [ ] The existing `if: github.ref == 'refs/heads/main'` guard on all three AWS steps (from PRD #1) is preserved unchanged
- [ ] A real deploy run succeeds, verified first against the distribution's default `*.cloudfront.net` hostname, then against `https://sandbox.akli.dev`
- [ ] `SandboxDeployRole`'s existing S3 permissions (from PRD #1) are confirmed sufficient for a bucket-root deploy with no policy change needed — or a gap is reported back to the primary PRD if not
- [ ] `index.html` links a web app manifest declaring `name`, `short_name`, and at least one icon
- [ ] The favicon is a real Sand-box-specific icon, not the default Vite icon

## Open Questions

- None.
