from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "audit" / "comparisons"
OUT.mkdir(parents=True, exist_ok=True)


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, "#0b0e14")
    x = (size[0] - copy.width) // 2
    y = (size[1] - copy.height) // 2
    canvas.paste(copy.convert("RGB"), (x, y))
    return canvas


def compare(source_name: str, implementation_name: str, output_name: str) -> None:
    source = Image.open(ROOT / "design-references" / source_name)
    implementation = Image.open(ROOT / "audit" / "screenshots" / implementation_name)
    slot = (920, 520)
    header = 54
    gap = 18
    board = Image.new("RGB", (slot[0] * 2 + gap, slot[1] + header), "#090c12")
    board.paste(fit(source, slot), (0, header))
    board.paste(fit(implementation, slot), (slot[0] + gap, header))
    draw = ImageDraw.Draw(board)
    font = ImageFont.load_default(size=22)
    draw.text((18, 15), "SOURCE", fill="#d4ad67", font=font)
    draw.text((slot[0] + gap + 18, 15), "IMPLEMENTATION", fill="#8cc2ff", font=font)
    board.save(OUT / output_name, quality=92)


compare("pause-card-source.png", "01-pause.jpg", "01-pause-comparison.jpg")
compare("follow-up-sidebar-source.png", "02-conversation.jpg", "02-sidebar-comparison.jpg")
