#!/usr/bin/env python3
"""Compose CrazyGames preview videos from captured frames.
Outputs: out/helltrain_preview_1920x1080.mp4 (landscape, mandatory 1080p 16:9)
         out/helltrain_preview_1080x1620.mp4 (portrait, mandatory 1080p 2:3)
"""
import os, subprocess, sys, json
from pathlib import Path
R = Path('/home/user/rec'); FF = str(R / 'ffmpeg')
FPS = 60
SEGS = [  # name, kind, transition-into-next, duration(s) from frame count
    ('01_action', 'game', 'pixelize'),
    ('02_home', 'menu', 'wipeup'),
    ('03_trainbase', 'menu', 'fade'),
    ('04_weapons', 'game', 'circleopen'),
    ('05_cards', 'game', 'fadewhite'),
    ('06_boss', 'game', 'pixelize'),
    ('07_finale', 'game', None),
]
OV = 0.45
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT2 = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'

def frames(name):
    d = R / 'frames' / name
    return len(list(d.glob('*.png')))

def title_filter(W, H):
    # Title card over the finale: fades in, sits in the lower third, drop-shadowed. No "play" text.
    t1, t2 = int(H * 0.11), int(H * 0.035)
    y1, y2 = int(H * 0.66), int(H * 0.78)
    a = "alpha='if(lt(t,0.5),0,if(lt(t,1.1),(t-0.5)/0.6,1))'"
    return (f"drawtext=fontfile={FONT}:text='HELL TRAIN':fontsize={t1}:fontcolor=#ffe9d6:"
            f"x=(w-text_w)/2:y={y1}:{a}:borderw={max(4,H//180)}:bordercolor=#7a0f12:"
            f"shadowcolor=#000000@0.8:shadowx=0:shadowy={max(6,H//120)},"
            f"drawtext=fontfile={FONT2}:text='THE SECTORS ARE OVERRUN. THE ONLY WAY OUT IS THROUGH.':fontsize={t2}:"
            f"fontcolor=#ffd27a:x=(w-text_w)/2:y={y2}:alpha='if(lt(t,0.9),0,if(lt(t,1.5),(t-0.9)/0.6,1))':"
            f"borderw=3:bordercolor=#000000@0.8")

def clip_filter(kind, name, W, H):
    final = (name == '07_finale')
    if W == 1920:  # landscape
        if kind == 'game':
            fg = f"scale={W}:{H}:flags=neighbor"  # 480x270 -> 1920x1080, exact 4x integer
            base = f"[0:v]{fg},eq=contrast=1.06:saturation=1.12,format=yuv420p[v0]"
        else:
            base = (f"[0:v]split[a][b];"
                    f"[a]scale={W}:{H}:flags=bicubic,boxblur=22:4,eq=brightness=-0.08:saturation=0.9[bg];"
                    f"[b]scale=-2:{H}:flags=neighbor[fg];"
                    f"[bg][fg]overlay=(W-w)/2:0,eq=contrast=1.04:saturation=1.1,format=yuv420p[v0]")
    else:  # portrait 1080x1620
        if kind == 'game':
            base = (f"[0:v]split[a][b];"
                    f"[a]scale={W}:{H}:force_original_aspect_ratio=increase:flags=bicubic,crop={W}:{H},boxblur=28:5,"
                    f"eq=brightness=-0.1:saturation=0.85[bg];"
                    f"[b]scale={W}:-2:flags=neighbor,eq=contrast=1.06:saturation=1.12[fg];"
                    f"[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v0]")
        else:
            base = (f"[0:v]split[a][b];"
                    f"[a]scale={W}:{H}:force_original_aspect_ratio=increase:flags=bicubic,crop={W}:{H},boxblur=28:5,"
                    f"eq=brightness=-0.1:saturation=0.85[bg];"
                    f"[b]scale=-2:{H}:flags=lanczos,eq=contrast=1.04:saturation=1.1[fg];"
                    f"[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v0]")
    base = base.replace('format=yuv420p[v0]', 'format=yuv420p[vb]')
    if final:
        base += (f";[1:v]format=rgba,fade=t=in:st=0.5:d=0.8:alpha=1[t];"
                 f"[vb][t]overlay=0:0,format=yuv420p[v0]")
    else:
        base = base.replace('[vb]', '[v0]')
    return base

def run(args):
    print('>', ' '.join(str(a) for a in args)[:300], flush=True)
    subprocess.run(args, check=True)

def build(W, H, outname):
    tmp = R / 'out' / f'_clips_{W}'
    tmp.mkdir(parents=True, exist_ok=True)
    clips, durs = [], []
    for name, kind, _ in SEGS:
        n = frames(name); d = n / FPS; durs.append(d)
        out = tmp / f'{name}.mp4'
        clips.append(out)
        vf = clip_filter(kind, name, W, H)
        extra = ['-loop', '1', '-framerate', str(FPS), '-i', str(R / ('title_1920.png' if W == 1920 else 'title_1080.png'))] if name == '07_finale' else []
        run([FF, '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(R / 'frames' / name / '%05d.png')] + extra + [
             '-filter_complex', vf, '-map', '[v0]', '-frames:v', str(n), '-r', str(FPS),
             '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-an', str(out)])
    # chain xfade transitions
    args = [FF, '-y', '-loglevel', 'error']
    for c in clips: args += ['-i', str(c)]
    parts, prev, acc = [], '[0:v]', 0.0
    for i in range(len(clips) - 1):
        trans = SEGS[i][2]
        acc += durs[i]
        offset = acc - (i + 1) * OV
        lab = f'[x{i}]' if i < len(clips) - 2 else '[vout]'
        parts.append(f"{prev}[{i+1}:v]xfade=transition={trans}:duration={OV}:offset={offset:.3f}{lab}")
        prev = lab
    total = sum(durs) - OV * (len(clips) - 1)
    print(f'{outname}: total {total:.2f}s', flush=True)
    args += ['-filter_complex', ';'.join(parts), '-map', '[vout]', '-r', str(FPS),
             '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
             '-movflags', '+faststart', '-an', str(R / 'out' / outname)]
    run(args)
    return total

if __name__ == '__main__':
    which = sys.argv[1:] or ['land', 'port']
    res = {}
    if 'land' in which: res['landscape'] = build(1920, 1080, 'helltrain_preview_1920x1080.mp4')
    if 'port' in which: res['portrait'] = build(1080, 1620, 'helltrain_preview_1080x1620.mp4')
    print(json.dumps(res))
