# npm Publishing

The public packages use the `@report-intelligence` npm scope. Releases are published by `.github/workflows/publish.yml` from a GitHub-hosted runner using npm trusted publishing (OIDC). The workflow contains no long-lived npm token; successful public-package releases receive npm provenance automatically.

## Packages and publish order

1. `@report-intelligence/core`
2. `@report-intelligence/crystal-client`
3. `@report-intelligence/plugin-api`
4. `@report-intelligence/grpc-transport`
5. `@report-intelligence/sdk`
6. `@report-intelligence/cli`
7. `@report-intelligence/mcp-server`

The workflow publishes in this order so internal dependencies exist before their consumers.

## One-time bootstrap

Trusted-publisher settings belong to an existing npm package, so each package must first be published manually by an npm organization owner using an account protected by two-factor authentication. Before that first publish:

1. Confirm the `report-intelligence` npm organization exists and your account can publish public packages in its scope.
2. Confirm all package versions and dependency ranges are intentional.
3. Run `npm ci`, `npm run typecheck`, `npm run build`, `npm test`, `npm audit`, and the dry-run commands below.
4. Sign in with `npm login`, then publish each workspace in the order above with `npm publish --workspace=<package> --access public`.

Never commit an npm token or `.npmrc` containing credentials.

## Configure trusted publishing

After the bootstrap publish, open **Settings → Trusted publishing** on every package at npmjs.com and add the same GitHub Actions publisher:

| Field | Value |
| --- | --- |
| Organization or user | `awad19977` |
| Repository | `Report-Intelligence-Platform` |
| Workflow filename | `publish.yml` |
| Environment | `npm-production` |
| Allowed action | Allow `npm publish` |

The repository URL in every `package.json` intentionally matches this GitHub repository exactly, as required by npm's OIDC validation.

Create the `npm-production` environment in GitHub before the first workflow release and protect it with required reviewers. Once OIDC publishing succeeds for every package, set each npm package's publishing access to **Require two-factor authentication and disallow tokens**, then revoke obsolete automation tokens.

## Release procedure

1. Update all packages that should be released to a version that is not already present on npm. Keep internal dependency ranges compatible.
2. Review and merge the release changes to `main`.
3. Open **Actions → Publish npm packages → Run workflow**.
4. Select `latest` for a stable release or `next` for a prerelease.
5. Review and approve the `npm-production` deployment.
6. Verify the versions, READMEs, licenses, and provenance attestations on npmjs.com.

The workflow uses Node.js 24, npm 11.5.1 or newer, `id-token: write`, disabled dependency caching, a serialized publish concurrency group, and build/test/audit gates. It does not set `NODE_AUTH_TOKEN`; npm exchanges the GitHub OIDC identity for a short-lived publishing credential.

## Local dry run

Run these commands after building to inspect exactly what each tarball will contain:

```sh
npm pack --dry-run --workspace=@report-intelligence/core
npm pack --dry-run --workspace=@report-intelligence/crystal-client
npm pack --dry-run --workspace=@report-intelligence/plugin-api
npm pack --dry-run --workspace=@report-intelligence/grpc-transport
npm pack --dry-run --workspace=@report-intelligence/sdk
npm pack --dry-run --workspace=@report-intelligence/cli
npm pack --dry-run --workspace=@report-intelligence/mcp-server
```

The workflow is intentionally not tag-triggered: a release requires an explicit dispatch plus the protected environment approval. Publishing is not atomic across seven packages; if a job stops partway through, do not reuse already-published versions. Fix the failure, increment only the remaining unpublished packages as appropriate, and review internal dependency ranges before retrying.
