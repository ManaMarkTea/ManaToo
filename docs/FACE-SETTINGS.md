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

Stocks are currently blocked for device deployment. A live test on firmware 530068
found that both multipart and JSON-only local-clock writes discard AppList/AppNum,
returning AppNum 0 and leaving the native stock fields blank. The decorative panel
has been restored, and deployment now rejects enabled stocks before changing the
device. Symbols can still be saved for a future supported integration.

The implementation follows Divoom's bundled U.S. Stocks template (162): native
rotating app title, price and percent-change fields, AppID 614, and its stock-list
configuration. It supports up to ten symbols and uses Divoom's data service;
availability and refresh depend on that service. No separate API key is needed.
Stock lists are stored in the face's AppList configuration; a shared global list
has not been established. No custom phone-app toggles have been established either.

The user's initial selection is saved as DJI (Dow Jones). The Divoom service returned
a populated quote for DJI, but NYA, ^NYA, NYSE, and NYA.IND returned zero placeholders;
no NYSE Composite entry was added.

Public source reference:
https://github.com/DivoomDevelop/divoom-watchface-visual-editor_AstroToo/blob/main/public/template/config/162.cfg

Changing these options does not update an existing public submission. Prepare and
review a new publishing candidate separately when ready.
