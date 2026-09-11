# Android development (USB, or network via Tailscale)

Two ways to run against a physical Android device:

- **USB** (default) — an `adb reverse` tunnel, dev client connects to
  `localhost:8081`. Simplest and most reliable while a cable is plugged in.
- **Network** — over Tailscale, no cable needed, works from any network.
  See [the second half](#network-no-usb-via-tailscale) of this document.

## USB (default)

Start Metro with the tunnel set up:

```sh
pnpm start-usb
```

This runs `adb reverse tcp:8081 tcp:8081` — forwarding the phone's
`localhost:8081` to Metro on this machine — and then
`expo start --dev-client` with `REACT_NATIVE_PACKAGER_HOSTNAME=localhost`,
so the QR code and manifest URLs also point at `localhost:8081` instead
of the machine's LAN IP (which the phone generally can't reach).

In the dev launcher on the phone, connect to:

```
http://localhost:8081
```

The launcher remembers the last URL, so later launches reconnect
automatically. USB debugging must be enabled and `adb devices` must
list the phone.

### When the tunnel breaks

The reverse tunnel is lost whenever the cable is unplugged/replugged or
the adb server restarts — the app then fails with
`Failed to connect to localhost/127.0.0.1:8081`. Fix it without
restarting Metro:

```sh
pnpm usb-reverse
```

then relaunch (or reload) the app.

## Network (no USB) via Tailscale

Developing against a physical Android device with no USB cable, using
Tailscale as the network layer. Works from any network (phone on mobile
data, different Wi-Fi, etc.) — both sides just need to be on the tailnet.

### Machine side (once)

Tailscale is installed and running on the dev machine (`milos-elite`,
`100.92.106.175`).

Check the current IP with:

```sh
tailscale ip -4
```

If it ever differs from the one in the `start-tailscale` script in
`package.json`, update the script. Tailnet IPs can also change for the
phone — always confirm both with `tailscale status` before
troubleshooting.

### Starting the dev server

```sh
pnpm start-tailscale
```

This runs `expo start --dev-client` with
`REACT_NATIVE_PACKAGER_HOSTNAME` set to the Tailscale IP, so the
manifest and bundle URLs Metro hands to the device point at
`100.92.106.175:8081` instead of whatever LAN IP the machine happens to
be on.

Plain `pnpm start` works only when phone and machine share a Wi-Fi
subnet, and breaks when the subnet changes.

### Phone side (once)

1. Install the Tailscale Android app and sign in to the same tailnet
   (device shows up in `tailscale status`, e.g. `miloss-s26`).
2. Keep the VPN connected while developing.

### Connecting

Open the Turnstone dev client on the phone and connect to:

```
http://100.92.106.175:8081
```

(or scan the QR code the dev server prints — it already encodes the
Tailscale URL). The dev launcher remembers the URL for next time.

Debug builds allow cleartext HTTP
(`android/app/src/debug/AndroidManifest.xml`), which the `100.x`
address requires.

## Wireless ADB over Tailscale

Full `adb` over the network — install APKs, read logcat, run
`pnpm android` — no USB needed.

### One-time setup on the phone

1. **Settings → Developer options → Wireless debugging → On.**
2. Open **Wireless debugging** and note the **IP address & Port**
   shown under the toggle. The port is random and changes whenever
   the toggle is cycled off and on.

### Pair (first time only, or after revoking)

1. On the phone: **Wireless debugging → Pair device with pairing
   code**. Keep this screen open — it shows a pairing IP:port and a
   6-digit code.
2. On the machine:

   ```sh
   adb pair <pairing-ip>:<pairing-port>
   # enter the 6-digit code when prompted
   ```

### Connect

```sh
adb connect <phone-tailscale-ip>:<port-from-wireless-debugging-screen>
adb devices   # should list <phone-tailscale-ip>:<port>
```

Use the phone's current Tailscale IP (see `tailscale status` — device
IPs change, e.g. `miloss-s26` was `100.92.77.106`, later
`100.110.199.3`). If connecting fails, check that the phone is online
in `tailscale status` and that Wireless debugging is still enabled —
Android sometimes disables it silently.

### What this unlocks

```sh
# install / update the dev APK without USB
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# live logs (crashes, console.log, Metro reloads)
adb logcat

# full build + install + launch, same as with USB plugged in
pnpm android
```

Note that `adb reverse tcp:8081 tcp:8081` also becomes available this
way, but it is unnecessary with the Tailscale setup — the phone reaches
Metro directly at `100.92.106.175:8081`. After `pnpm android` (which
sets up its own reverse tunnel), relaunch the app from the dev launcher
and connect to the usual Tailscale URL to get that stable path back.

## Troubleshooting

- **`Failed to connect to localhost/127.0.0.1:8081` (USB)** — the
  reverse tunnel died; run `pnpm usb-reverse` and reload the app.
- **`Failed to connect to /<LAN-IP>:8081`** (e.g. `192.168.100.6`) — the
  launcher is reusing a remembered LAN URL, which usually got there by
  scanning the QR code printed by a plain `pnpm start` session. Never
  scan that QR while developing over USB. Fix: open the launcher home
  and connect to `http://localhost:8081` (it's under "Recently
  opened"), or restart with `pnpm start-usb` and scan its QR — it
  encodes `localhost`.
- **White screen right after a Metro restart** — the dev client is
  downloading the bundle from a cold Metro cache; give it ~1 minute.
  The error screen above can also appear if the phone tries to connect
  while Metro is mid-restart (port briefly unbound) — the launcher
  never auto-retries a failed load, so relaunch the app once Metro is
  up.
- **Dev launcher frozen / blank** — check that Metro is actually
  running on the machine first; a dead bundler looks like a hang on
  the phone.
- **"Cannot connect" (network)** — verify the phone's Tailscale VPN is
  on and the device appears online in `tailscale status`, and that
  `curl http://100.92.106.175:8081/status` answers on the machine.
- **Wrong URL after network change** — reconnect the dev launcher to
  `http://100.92.106.175:8081`; the Tailscale IP never changes with
  Wi-Fi subnets.
