# Icon Fix Instructions

The video mode icons are showing as question marks because the emojis aren't rendering properly.

## Changes needed in CameraScanner.js:

### Line ~471 - Mode button text:
Change from:
```
{captureMode === 'photo' ? '📷 Photo Mode' : '� Video Mode'}
```

To:
```
{captureMode === 'photo' ? '📷 Photo Mode' : '🎬 Video Mode'}
```

### Line ~510 - Video button icon:
Change from:
```
<Text style={styles.videoIcon}>�</Text>
```

To:
```
<Text style={styles.videoIcon}>⏺</Text>
```

## Alternative: Use text instead of emojis

If emojis don't work, use:
- `📷 Photo Mode` → `PHOTO Mode`
- `🎬 Video Mode` → `VIDEO Mode`  
- Video record button: `⏺` → `REC`
