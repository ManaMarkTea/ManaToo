# Panel settings

Edit `config/face.json`, or use these commands:

```powershell
npm run face:settings
npm run face:settings -- music off
npm run face:settings -- weather off
npm run face:settings -- symbols AAPL,MSFT
npm run face:settings -- stocks on
npm run face:deploy
```

Use `on` or `off` for music, weather, and stocks. Deploy rebuilds the face first.
Music and weather default to on; stocks default to off with no selected symbols.
Disabled music/weather panels become syntax-colored decorative code, preserving their
positions. Stocks replace the original code panel; disabling stocks restores it.
Mia, date, time, battery, and Sun/Moon stay in place.

These are project settings, applied by redeploying from the PC. Custom switches in
the Divoom phone app are not supported by this workflow. The face runs independently
after deployment.

Stocks are experimental until verified with your selected symbols on the device.
The implementation follows Divoom's bundled U.S. Stocks template (162): native
rotating app title, price and percent-change fields, AppID 614, and its stock-list
configuration. It supports up to ten symbols and uses Divoom's data service;
availability and refresh depend on that service. No separate API key is needed.
Stock lists are stored in the face's AppList configuration; a shared global list
has not been established. No custom phone-app toggles have been established either.

Public source reference:
https://github.com/DivoomDevelop/divoom-watchface-visual-editor_AstroToo/blob/main/public/template/config/162.cfg

Changing these options does not update an existing public submission. Prepare and
review a new publishing candidate separately when ready.
