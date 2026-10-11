# HELL TRAIN — CrazyGames preview trailer

Rebuilds the two mandatory CrazyGames preview videos from the live game:
- `helltrain_preview_1920x1080.mp4` — landscape, 16:9 (mandatory)
- `helltrain_preview_1080x1620.mp4` — portrait, 2:3 (mandatory)

Length ~17 s, 60 fps, no audio track, under the 20 s / 50 MB limits.

## Pipeline
1. `record.mjs` drives `index.html` in headless Chromium on a virtual clock (60 ticks/s), so every frame is deterministic. Writes PNG frames per segment to `frames/`.
2. `title.py` renders the finale title overlay (Pillow).
3. `compose.py` builds each segment with ffmpeg (integer nearest-neighbour upscale, blurred fill instead of black bars) and joins them with xfade transitions.

## Run
Needs: Node (puppeteer-core, @sparticuz/chromium), Python 3 with Pillow, and an ffmpeg binary at `./ffmpeg`.
```
cd <workdir with these files>
node record.mjs            # or ONLY=01_action,06_boss node record.mjs to re-shoot some segments
/path/to/venv/bin/python title.py
python3 compose.py          # both sizes; or `compose.py land` / `compose.py port`
```
Paths in the scripts assume the working directory `/home/user/rec`; adjust `R` in `compose.py` if needed.
