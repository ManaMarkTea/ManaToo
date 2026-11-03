# Native now-playing metadata investigation

The face uses the official AstroToo `disp=219` (`MUSIC_TITLE`) and `disp=490` (`MUSIC_SINGER`) fields. These read the device audio service directly; the face does not run a PC bridge.

On the development device (hardware 530, firmware 530068), YouTube playback in Chrome on Windows produced:

- Windows' read-only media-session query returned the complete video title and channel name.
- The AstroToo artist field followed channel changes correctly.
- The AstroToo title field remained `Divoom`.
- The stock **Lyrics EQ** face (227) also displayed `Divoom` as its title, so the symptom is not specific to this custom layout or its column width.
- Both a long title containing an emoji and a short ASCII title reproduced the issue. A length/emoji-only explanation was not supported by that test.

The exact failure point within Windows' Bluetooth metadata path and AstroToo's firmware remains unverified. The available display catalog exposes no separate Bluetooth-video-title field to substitute for `MUSIC_TITLE`. A face-layout change has not resolved this issue.

For a Divoom support report, reproduce using Chrome on Windows over Bluetooth, compare the operating system's media-session title with both the custom title widget and the stock Lyrics EQ face, and include the firmware version. No report has been submitted automatically. Testing another playback application/source would help isolate the Bluetooth/firmware behavior further.
