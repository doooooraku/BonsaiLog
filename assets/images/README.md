# assets/images/

App icons, splash screens, and other visual assets.

## ⚠ Replace BEFORE first release

The icons currently shipped with the template are **Expo defaults**.
Replace them with your app's icons before submitting to the store.

## Required files

| File                          | Size                 | Used by                            | Notes                                      |
| ----------------------------- | -------------------- | ---------------------------------- | ------------------------------------------ |
| `icon.png`                    | 1024×1024            | iOS / Android adaptive icon source | **Square**. No transparency for App Store. |
| `splash-icon.png`             | 200×200+             | Splash screen logo                 | Centered on background.                    |
| `android-icon-foreground.png` | 432×432 (108dp @ 4x) | Android adaptive icon foreground   | Drawable layer.                            |
| `android-icon-background.png` | 432×432              | Android adaptive icon background   | Solid color or gradient.                   |
| `android-icon-monochrome.png` | 432×432              | Android themed icon (Android 13+)  | Single color (will be tinted).             |
| `favicon.png`                 | 48×48                | Web favicon                        | For Expo Web build.                        |

## Generate from a single source

You can generate all sizes from one 1024×1024 master:

```bash
# Use https://easyappicon.com/ or https://www.appicon.co/
# OR use a CLI like sharp:
npx sharp-cli resize 1024 1024 source.png -o assets/images/icon.png
```

## Sample / template files (delete these)

These are Expo defaults. Delete after replacing with your own:

- `partial-react-logo.png`
- `react-logo.png`
- `react-logo@2x.png`
- `react-logo@3x.png`

(`setup.sh` deletes these automatically when DELETE_SAMPLES=Y)

## Adaptive icon background color

The background color is set in `app.json`:

```json
{
  "expo": {
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```
