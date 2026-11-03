# Publish Puppy Mia Time System

Publishing uses the [official AstroToo sharing protocol](https://github.com/DivoomDevelop/divoom-watchface-visual-editor_AstroToo/blob/main/docs/WATCHFACE_SHARE.en.md). The AstroToo uploads the face and its resources to Divoom, which reviews public submissions. A successful submission is usually **Pending review**, not immediately visible in the public gallery.

## Prepared listing

- Title: **Puppy Mia Time System**
- Version: **0.1.0**, from `package.json`
- Category: **Multi-Info Dashboards** (`110`), verified against the live AstroToo catalog
- Public-facing summary: a terminal-style clock with an animated blonde cockapoo, time/date, weather, sunrise/sunset, and a live moon icon
- Review notes: **v0.1.0: Initial public release.**

Edit the title, category, description, and release notes in `config/publish.json`. The description is a local listing draft for review; this documented API sends `ClockName`, category, visibility, and `MessageInfo` release notes, with no separate description field. No unsupported field is sent to the server.

## Prepare and review

Start with the face already deployed and selected on the AstroToo. The computer and device must be on the same LAN. The device must also have Internet access for public submission.

```powershell
npm run publish:prepare
npm run publish:check
```

Preparation reads the device's capabilities and layout, checks source/deployed item fields, captures its current screen, and creates `exports/publish/v0.1.0/`:

- `preview.png` — the 480×480 screenshot to review
- `preview.webp` — the app preview sent during submission
- `clock.json` and the referenced asset files — a portable editor import
- `manifest.json` — the device-bound candidate, listing, version, and file hashes

`publish:check` is read-only on the device. It checks the target device, source version, listing, layout, candidate/source asset hashes, and current category catalog. A changed source, asset, or listing requires preparation again. The device's stored image files cannot be hash-verified through the documented layout readback; review the captured preview to confirm the deployed artwork.

These generated files stay out of Git because they include device identity and current device data. Preparation and checking do not call the sharing endpoint or upload assets. Review the local preview before submitting.

## Submit for public review

```powershell
npm run publish:submit
```

**This command is the publishing action.** It validates the candidate again, stages the WebP preview, attaches the preview and public title to the existing custom face, then calls `Device/ShareLocalClock` with `ShareToOthers=true`. It does not replace the face layout or change the device's weather/location settings.

The device uploads its locally stored panel images, Mia animation, state images, backdrop, preview, and configuration. Receipts are saved under `exports/publish/receipts/`. Device confirmation must include successful public sharing, the expected category, and a review/published status. A timed-out or unconfirmed sharing request is not retried automatically: check server status first.

## Review status

```powershell
npm run publish:status
```

This reads the official server using the actual device ID and custom clock ID. Output is one of: no online record, private, awaiting user reply, pending Divoom review, published, rejected, or an explicit error/unknown status. Review messages are saved in `exports/publish/review-history.json`. Use **Review history** in the official editor if Divoom asks for a response.

## Hourly review monitoring on Windows

`npm run review:schedule` creates the current user's `ManaToo-PublicReview-Hourly` Task Scheduler job. It starts at the next whole hour, checks hourly for three days, and expires automatically. To choose a different duration, use `npm run review:schedule -- -Days 5` (1–14 days).

Checks use the prepared candidate's cached device ID, so the AstroToo itself need not remain on the LAN. This PC must be on, online, and logged in. Missed checks can run after the PC becomes available; the job does not wake a sleeping PC. Status changes trigger a Windows desktop balloon notification (subject to Windows notification settings).

`exports/review-watch/latest.json` contains the last successful result; `checks.jsonl` contains timestamped checks and errors. Network errors preserve the previous known status. `npm run review:watch` runs a check manually during the monitoring period. The task expires after the configured period and Windows removes it one hour later. To stop it early:

```powershell
Unregister-ScheduledTask -TaskName ManaToo-PublicReview-Hourly -Confirm:$false
```

## Later versions

Update `package.json` and `config/publish.json` release notes, then rebuild, deploy, and prepare again:

```powershell
npm run face:draw
npm run face:deploy
npm run publish:prepare
npm run publish:check
# After reviewing the new preview:
npm run publish:submit
```

Run `npm run face:sprites` before drawing if Mia's dimensions or state-image artwork changed. Update messages are required by Divoom; the script always supplies versioned release notes. Publishing an unchanged face can be rejected by the server.

## Official editor alternative

Run `npm run editor`, select the AstroToo, and use the editor's **Import** folder command to load `exports/publish/v0.1.0/`. The folder includes `clock.json`, all referenced leaves, and the app preview. Folder import treats it as a local design; create/apply it using the editor before choosing **Upload Watchface**. Select sharing with other users and the appropriate category. That is an alternative to `publish:submit`; avoid submitting the same design through both paths.

## Verification

`npm run test:publish` tests read-only defaults, ordered upload/patch/share operations, rejection of private/unconfirmed outcomes, and stale/wrong-device candidate guards. Preparation, the live read-only preflight, status lookup, and editor import parsing were checked. The real public submission step is deliberately not run as part of preparation.
