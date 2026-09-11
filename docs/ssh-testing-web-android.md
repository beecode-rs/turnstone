# Testing SSH: browser vs Android device

What to run when testing SSH on each platform, and what to change when
switching between them.

| Platform | Terminals needed | SSH transport |
| --- | --- | --- |
| Web (browser) | `pnpm start` **and** `pnpm relay` | WebSocket relay → local TCP |
| Android device | `pnpm start-usb` (no relay) | Native TCP socket, direct |

## Web (browser)

Browsers cannot open raw TCP sockets, so the web client tunnels through a
local WebSocket relay (`scripts/ssh-web-relay.mjs`). Two terminals:

```sh
# terminal 1 — Metro (serves the web app too; press w to open in browser)
pnpm start

# terminal 2 — SSH relay, listens on ws://localhost:4022
pnpm relay
```

The relay is a separate process from Metro — it must be running whenever
SSH is tested in the browser. Override its URL with
`EXPO_PUBLIC_SSH_RELAY_URL` (default `ws://localhost:4022`,
`src/lib/ssh2-client.web.ts`).

**Without the relay**, SSH tests in the web app fail with a timeout and:

```
Error: Unable to reach the SSH relay. Is it running? (pnpm relay)
```

Check it is listening:

```sh
ss -tlnp | grep 4022
```

## Android device

No relay — the native client connects over a real TCP socket. Use the dev
build (`com.turnstoneapp`), never Expo Go.

```sh
pnpm start-usb
```

Then launch the dev client on the phone and connect to
`http://localhost:8081` (the launcher remembers it). Details, Tailscale
fallback, and troubleshooting: [android-network-dev.md](android-network-dev.md).

## Switching between the two

**Web → Android**

1. Start `pnpm start-usb` (or reuse the running Metro and just run
   `pnpm usb-reverse` if the cable was re-plugged).
2. Relaunch the dev client on the phone; connect to `localhost:8081`.
3. The relay terminal can stay running — the phone ignores it.

**Android → Web**

1. Keep Metro running (the same instance serves the web app; press `w`).
2. Start `pnpm relay` in a second terminal — this is the step that's
   easy to forget after a session on the device.
3. Reload the browser tab and test SSH.

## Quick diagnosis

- **Web SSH times out + "Unable to reach the SSH relay"** — relay not
  running: start `pnpm relay`.
- **Phone: `Failed to connect to localhost/127.0.0.1:8081`** — adb
  reverse tunnel died: run `pnpm usb-reverse` and reload the app.
- **Phone connects but SSH fails with native/crypto errors** — make sure
  it's the dev build, not Expo Go or a stale install.
