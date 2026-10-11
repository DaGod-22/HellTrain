# Renders the finale title overlay (transparent PNG) for both CrazyGames sizes.
from PIL import Image, ImageDraw, ImageFont
import sys
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FM = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
def make(W, H, out):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    size = int(H * 0.11)
    while True:
        t1 = ImageFont.truetype(FB, size)
        if t1.getlength('HELL TRAIN') <= W * 0.84 or size < 40: break
        size -= 4
    t2 = ImageFont.truetype(FM, int(H * 0.035))
    title, sub = 'HELL TRAIN', 'THE SECTORS ARE OVERRUN. THE ONLY WAY OUT IS THROUGH.'
    if W < H:  # portrait: lower the block a bit, wrap the tagline
        sub_lines = ['THE SECTORS ARE OVERRUN.', 'THE ONLY WAY OUT IS THROUGH.']
        y_title = int(H * 0.70); y_sub = int(H * 0.80)
    else:
        sub_lines = [sub]
        y_title = int(H * 0.66); y_sub = int(H * 0.79)
    # soft dark scrim behind the text so it reads over any frame
    scrim = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(scrim)
    sd.rectangle([0, int(y_title - H * 0.04), W, int(H * 0.97)], fill=(10, 4, 20, 110))
    img = Image.alpha_composite(img, scrim)
    d = ImageDraw.Draw(img)
    sw = max(4, H // 180)
    def centred(text, font, y, fill, stroke, sw_):
        bbox = d.textbbox((0, 0), text, font=font, stroke_width=sw_)
        x = (W - (bbox[2] - bbox[0])) // 2 - bbox[0]
        d.text((x + 0, y + max(6, H // 120)), text, font=font, fill=(0, 0, 0, 200), stroke_width=sw_, stroke_fill=(0, 0, 0, 200))
        d.text((x, y), text, font=font, fill=fill, stroke_width=sw_, stroke_fill=stroke)
    centred(title, t1, y_title, (255, 233, 214, 255), (122, 15, 18, 255), sw)
    for i, line in enumerate(sub_lines):
        centred(line, t2, y_sub + i * int(H * 0.05), (255, 210, 122, 255), (0, 0, 0, 220), 3)
    img.save(out)
    print('wrote', out)
make(1920, 1080, '/home/user/rec/title_1920.png')
make(1080, 1620, '/home/user/rec/title_1080.png')
