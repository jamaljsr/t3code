# Personal fork on a Linux server

> This file exists only on the personal fork.

`minix` (hostname `TWINMINIX`, `ssh minix`) is a Linux x64 box that runs a T3 Code server for the desktop app over the LAN. It must run this fork, not upstream: the desktop app's diff panel reads the personal review fields and RPCs (see [Personal overlay](../internals/personal-overlay.md#protocol)), and an upstream server fails it with `Missing key at ["value"]["sources"][0]["manifest"]`.

## How it is installed

- t3 was installed with the official script (`curl -fsSL https://t3.codes/install.sh | sh`). The script sets up the parts the fork reuses:
  - the systemd user unit `t3code.service`, which runs `~/.t3/runtime/versions/<version>/t3 __service-launcher`
  - the launcher link `~/.local/bin/t3`
  - `~/.t3/runtime/service-state.json`, which records the active version
- The runtime folder holds the fork's build in place of upstream's. It has the same layout as upstream's archive: the `t3` executable, `client/`, `resource-monitor/`, `node_modules/`, and the `.install-complete` sentinel. The service launcher refuses a runtime unless that sentinel contains its version.
- The fork checkout is `~/dev/t3code` on the `personal` branch. `vp` is installed in `~/.vite-plus`.
- The server is not linked to T3 Connect. Local builds have no Clerk or relay configuration (the release job injects those), so a fork build cannot serve T3 Connect.

## Updating the server

Updates are manual. Run the script after merging upstream and pushing `personal`, or after any other change to `personal` the server should pick up:

```sh
ssh minix '~/dev/t3code/scripts/personal-update-server.sh'
```

[`scripts/personal-update-server.sh`](../../scripts/personal-update-server.sh) pulls `personal`, builds the CLI archive, smoke-tests it, and installs it as `~/.t3/runtime/versions/<version>`. A runtime already in that folder moves to `~/.t3/runtime-backups/`. When the version is the one the service runs, the script restarts the service. When the version is new, the new runtime's own `t3 service install` points the unit and the service state at it, and the script repoints `~/.local/bin/t3`. If the service does not stay up and answer HTTP, the script returns to the previous runtime. A run takes a couple of minutes and drops the server for under a minute, which interrupts running turns.

The script downloads upstream's release archive of the same version only to take its prebuilt resource monitor, a Rust binary, so the fork's version must match a stable upstream release. Every fold of a release tag does.

## Rules

- Never run `t3 update` on the server, and never accept a server update for it from a client's update prompt. Both install upstream's build, which breaks the desktop diff panel.
- Build from the repo root. The single executable must embed the Node that the root `package.json` pins, and `vp` selects a different Node inside `apps/server`.
- Each run leaves a backup of a few hundred MB in `~/.t3/runtime-backups/`. Delete old ones by hand.

## Rolling back by hand

Stop the service, move the bad runtime out of `~/.t3/runtime/versions/<version>`, move a backup from `~/.t3/runtime-backups/` into its place, and start the service. If the failed update moved the service to a new version, also run `~/.t3/runtime/versions/<previous version>/t3 service install --base-dir ~/.t3 --allow-downgrade` and repoint `~/.local/bin/t3` at that runtime. If restarts hit the unit's start limit, clear it first with `systemctl --user reset-failed t3code.service`. `~/.t3/runtime-backups/0.1.3-upstream` holds the upstream build the official installer put there.

Check the result with `systemctl --user status t3code.service` and `tail ~/.t3/userdata/logs/boot-service.log`.
