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

### Code Screensaver clock

`faces/code-clock/` contains a terminal-style face inspired by ManaRenderer's CodeScreensaver: near-black panels, green outlines, line numbers, and syntax-colored snippets. Code panels are static artwork; the time and date are native live device elements. It runs without a connected PC.

```powershell
npm run face:deploy
```

This creates or updates the MCP-managed custom face, selects it, reads it back, and saves a device screenshot as `exports/code-clock.bmp`. It also saves the previously displayed configuration in `exports/before.json`. Other stock clockfaces remain available through the Divoom app.

To customize: change time/date colors, positions, or sizes in `faces/code-clock/metadata.json`; edit `scripts/draw-code-clock.ps1` for the terminal artwork, then run `npm run face:draw` (Windows PowerShell + System.Drawing) and `npm run face:deploy`. Font 28 was confirmed installed on the development device. The background JPEG is committed, so drawing is optional.

For visual design from scratch, run `npm run editor`, open its printed localhost URL, choose a template or new design, and select your AstroToo in its device controls. The editor stores its own designs; the Code Clock metadata here is intended for the scripted LAN workflow.

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
