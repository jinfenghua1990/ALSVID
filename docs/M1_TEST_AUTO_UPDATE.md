# M1 local Docker automatic updates

Related: #68. Production remains on Cloud Run. This installer updates only the local Docker stack; it does not deploy to or represent a cloud Test environment.

## One-time installation from any directory

Keep Docker Desktop running and use the Node installation already used by ALSVID. Paste:

```bash
curl -fsSL https://raw.githubusercontent.com/jinfenghua1990/ALSVID/main/scripts/macos-test-auto-update.mjs -o /tmp/alsvid-test-auto-update.mjs && node /tmp/alsvid-test-auto-update.mjs install
```

The installer locates the existing ALSVID / ALSVID-Next repository and registers a per-user macOS LaunchAgent. If multiple repositories are found, specify the existing active checkout:

```bash
node /tmp/alsvid-test-auto-update.mjs install "/absolute/path/to/ALSVID"
```

Do not install a GitHub self-hosted runner on the M1 for this purpose. No inbound connection, public webhook listener, sudo, long-lived GitHub token or change to production credentials is required. The current repository is public; private-repository support is not implemented.

## Behavior

- At user login and every five minutes while the Mac is awake, check the latest main SHA.
- Wait for exact-SHA, main-push CI to succeed.
- Build in a separate managed checkout under `~/Library/Application Support/ALSVID/test-auto-update/repo`; never switch, reset, stash or overwrite the user's development checkout.
- Reuse the original `.env` and `infra/.env.test.local` files when present; never copy secret values to GitHub or log rendered Compose configuration.
- Preserve the existing Test Compose project name and database volumes. Do not run `down -v`, cleanup volumes or operate on Production.
- Build all containers before changing the running stack. If the local development gateway occupies 8080, switch its gateway off and use the Docker Test gateway. Node development processes are not terminated.
- Apply Test migrations explicitly, start the stack and verify API health and login page before recording the deployed SHA.
- Retry network/Docker/acceptance failures next cycle. A failed build leaves running containers unchanged. Failure after migrations or container replacement may require diagnosis; database rollback and automatic software rollback are not promised.

No provider is changed. Local configuration is not proof of cloud resource bindings. The updater rejects Production configuration and never accesses Production credentials.

First installation can take several minutes to clone/build. Updates are not instantaneous. Mac sleep, logout, Docker shutdown and failed acceptance delay updates. Docker Desktop must be running; this LaunchAgent does not change Docker login settings.

Open `http://localhost:8080/portal-launcher`; sign in and refresh to see the latest accepted version. Dealer/My remain internal previews.

## Inspect and stop

Log: `~/Library/Application Support/ALSVID/test-auto-update/update.log`.

Stop automatic checks while keeping containers, data and settings:

```bash
node "$HOME/Library/Application Support/ALSVID/test-auto-update/updater.mjs" uninstall
```

Re-running the installation updates the installed updater. The background job does not replace its own executable from each release.

## Validation boundary

Node tests cover acceptance gating, production configuration rejection and LaunchAgent path escaping. Shell-free child-process invocation supports spaces in checkout paths. Actual macOS launchctl registration and Docker replacement require one installation on the M1; Linux CI cannot certify them.
