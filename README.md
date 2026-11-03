# ManaToo

Workspace for custom Divoom AstroToo clockfaces, using Divoom's official [AstroToo editor](https://github.com/DivoomDevelop/divoom-watchface-visual-editor_AstroToo) and [LAN MCP server](https://github.com/DivoomDevelop/mcp-divoom-lan).

## Start

Requires Node.js 20+ and Git. From this folder:

```powershell
npm run setup
Copy-Item config/device.example.json config/device.local.json
# Edit config/device.local.json to set the device's LAN IP.
npm run device:info
npm run editor
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173). Select the AstroToo device in the editor. The computer and device must be on the same LAN. Local configuration is ignored by Git; preserve it if already configured.

## Authoring

For public gallery submission, see [the publishing workflow](docs/PUBLISH.md). `npm run publish:prepare` builds a review candidate and preview; `npm run publish:check` validates it without publishing. `npm run publish:submit` is the separate action that sends it to Divoom for public review.

The top-right header displays `MANATOO / LOCAL / v<version>` using `package.json`. After changing the version, run `npm run face:draw` and `npm run face:deploy` to update the device label.

The upper-right battery indicator uses native `disp=492`, with percentage bands in 10% steps and a charging bolt. The device selects among twenty generated battery states, so the indicator updates without a PC.

### Code Screensaver clock

`faces/code-clock/` contains a terminal-style face inspired by ManaRenderer's CodeScreensaver: near-black panels, green outlines, line numbers, and syntax-colored snippets. The solid backdrop has no panel artwork. Seven independent image elements provide terminal frames, titles, and decorative labels; eight native text elements provide the clock, date, weekday, sunrise, sunset, temperature, conditions, and daily temperature range. The date sits to the left of the clock. Below them, the weather row has three columns: current temperature, conditions, and daily range. The final row groups sunrise, sunset, and the live moon-phase icon. A native moon-state image element selects an emoji-style icon from eight generated phase frames. The native DIY-text probe did not render a supplied literal on the development firmware, so decorative labels remain rasterized within each panel. Weather and solar times use the location and weather service configured on the AstroToo. Mia, the blonde cockapoo, has her own `pet/Mia.webp` panel in a square panel in the upper-left decorative row, with a looping tail wag and blink. Stacked AM/PM indicators use a two-state native AM/PM image element, with the active period highlighted. Both animations run on the device without a connected PC.

```powershell
npm run face:deploy
```

This creates or updates the MCP-managed custom face, selects it, reads it back, and saves a device screenshot as `exports/code-clock.bmp`. It also saves the previously displayed configuration in `exports/before.json`. Other stock clockfaces remain available through the Divoom app.

To customize: edit `faces/code-clock/layout.json`. Each panel has a position, dimensions, editable title/labels, and native `items` positioned relative to that panel. The decorative JavaScript uses `codeLines` with individually colored text spans for syntax highlighting. Run `npm run face:draw` (Windows PowerShell + System.Drawing) to generate the separate panel PNGs, solid backdrop, and `metadata.json`; then run `npm run face:deploy`. Deployment uploads panel files sequentially and binds their returned local references. Generated metadata contains portable `asset:` placeholders; use the deployment script to resolve them. Do not edit generated metadata directly. The clock uses PlayerSansMono8x8 (font 116); information panels use Sono SemiBold (font 138). Both were confirmed installed on the development device. All generated assets are committed, so drawing is optional. If Mia's item dimensions change, run `npm run face:sprites` before deploying; the device animation must be encoded at its display size. To rebuild the animation assets, install `python -m pip install -r requirements-art.txt` and run `npm run face:sprites`. The dog sheet was generated using ImageGen; `build-clock-sprites.py` slices its four cells and packages frames as a Divoom DIVM container. AstroToo requires baseline JPEG frames with YCbCr 4:2:0 sampling; animated WebP uploads were rejected by the development firmware. The `.webp` files are local previews; `.bin` files are deployed. Moon icons are generated procedurally and selected by native `disp=207`; the icon shares the sunrise/sunset panel with no phase-name text. It follows the device weather/moon provider rather than a fixed image or a PC clock.

For visual design from scratch, run `npm run editor`, open its printed localhost URL, choose a template or new design, and select your AstroToo in its device controls. The editor stores its own designs; the Code Clock metadata here is intended for the scripted LAN workflow.

### Device weather and time limitations

The main clock uses the device's time preference. Native sunrise/sunset widgets currently return 24-hour text independently; the documented LAN interface does not expose a formatting override or the saved weather ZIP code. No fixed timezone/DST subtraction is applied. On the development device, an incorrect solar/weather feed was reproduced on the stock Neon Horizon face and resolved by using auto-location in the Divoom app. The face continues using the device-configured location. Do not change a correct main-clock timezone to compensate for a weather feed problem.

- Save source designs under `faces/<name>/`, images under its `assets/` directory, and generated exports under `exports/`.
- `faces/starter/metadata.json` is a minimal LAN creation metadata example, not an editor project file. Create a design in the editor for visual editing.
- Canvas: 480×480. Backdrop: JPEG or WebP, strictly smaller than 512000 bytes. AstroToo does not accept watchface TAR/TGZ/ZIP bundles.
- Confirm fonts installed on the device before upload. Starter font 28 comes from Divoom's AstroToo workflow example.
- For MCP creation, provide the metadata and a backdrop path to `watchface_create_local_clock`, omitting `ClockId`. The server manages its custom slot. Read back and capture a screenshot after writing.
- Element assets must be uploaded sequentially before binding them into the design.

`npm run build` builds both tools. `npm run device:info` reads identification and capabilities without changing the display. No deployment happens during setup.

## MCP integration

The built stdio server is `tools/mcp-divoom-lan/dist/index.js`. Start with `npm run mcp`, or configure an MCP client to launch `node` with that file's absolute path. Set `DIVOOM_DEVICE_MODEL=auto`; optionally set `DIVOOM_DEVICE_HOST`, or pass `target.host` with tool calls. This workspace does not change global client configuration.

Product catalogs: `tools/mcp-divoom-lan/resources/astrotoo/`. Full deployment instructions: `tools/mcp-divoom-lan/docs/astrotoo-watchface-workflow.md`.

## Tool versions

Official repositories are pinned by commit in `config/toolchain.json` and installed under ignored `tools/`. Setup installs their locked dependencies and applies compatible audit fixes locally. It also fixes an upstream reassigned `const` in the editor's pending-font cache so Vite development mode can start. Their own licenses apply. Custom sources and documentation live in this repository; upstream code, downloaded assets, local addresses, and build outputs are excluded.
