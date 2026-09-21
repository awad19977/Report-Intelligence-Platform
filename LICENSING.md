# Licensing and Source Boundary

## Model

The Report Intelligence Platform uses an open-core model:

- Stable platform contracts and developer tooling are open source under the GNU Lesser General Public License v3.0 only (`LGPL-3.0-only`).
- Proprietary report-engine implementations and enterprise features are commercial.

The purpose is to let developers build integrations without reverse engineering the platform while protecting the specialized implementation that operates proprietary report formats and runtimes.

## Public LGPL-3.0-only components

The public repository contains:

- MCP server and CLI.
- Core report-facing contracts and validation schemas.
- Plugin API and public SDK.
- Crystal client SDK.
- Versioned worker protocol and transport abstractions.
- Mock workers and test utilities.
- Generic configuration, logging, validation, documentation, and search utilities.
- Public examples, templates, tutorials, and contribution tooling.

The public Crystal client SDK may contain request and response models, worker lifecycle clients, IPC/gRPC clients, and developer helpers. It must not contain the production SAP Crystal SDK implementation.

Applications that merely use or link to these public libraries may remain under terms of their authors' choice, subject to LGPL requirements such as preserving notices, providing the LGPL-covered source and modifications when distributed, and permitting replacement or relinking of the LGPL-covered library. Copying LGPL-covered implementation code into another work or distributing a statically linked combined work may create additional obligations.

## Commercial components

The separate commercial repository contains:

- Production SAP Crystal Reports runtime integration.
- The production Windows Crystal worker.
- Proprietary `.rpt` reader/writer mappings and compatibility behavior.
- Advanced formula analysis or compilation.
- Editing and report generation.
- Advanced validation, optimization, and migration.
- Official commercial plugins for other proprietary report engines.
- Enterprise authentication, collaboration, audit, scheduling, high availability, and hosted services.

## Repository separation status

The source boundary is physically separated:

- This repository contains the LGPL-3.0-only public platform code.
- The production Crystal runtime adapter and Windows worker live in the separate private `report-intelligence-commercial` repository.
- Public code interacts with the commercial worker only through the versioned protocol and a configured executable path.

The root `LICENSE` contains the GNU Lesser General Public License v3.0 terms. `COPYING` contains the GNU General Public License v3.0 terms incorporated by the LGPL. Package-level `LICENSE` files contain both texts so each npm tarball is self-contained. SAP runtime redistribution terms and the obligations of any combined distribution remain separate legal-review items.

## Repository split

```text
report-intelligence-platform/          # Public, LGPL-3.0-only
  apps/mcp-server/
  apps/cli/
  packages/core/
  packages/plugin-api/
  packages/sdk/
  packages/crystal-client/
  packages/worker-protocol/
  examples/
  docs/

report-intelligence-commercial/        # Private, proprietary
  plugins/crystal-plugin-core/
  workers/crystal-worker/
  enterprise/
  cloud/
```

## Product editions

### Community

- Public MCP server and CLI.
- Plugin contracts and SDKs.
- Documentation and examples.
- Mock/test development workflow.

### Professional

- Licensed Crystal runtime adapter and worker.
- Advanced report analysis, editing, generation, and validation.
- Commercial support.

### Enterprise

- Professional capabilities.
- Enterprise identity, authorization, audit, collaboration, scheduling, centralized management, and high availability.

## Long-term business model

Revenue may come from commercial plugins, enterprise features, hosted services, support, consulting, training, and a future marketplace. The public platform and plugin contracts should remain usable without proprietary infrastructure.
