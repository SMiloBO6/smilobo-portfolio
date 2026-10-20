from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

# Long edges are capped to realistic display sizes while retaining enough
# resolution for high-density screens.
LIMITS = {
    "covers": (960, 78),
    "works": (1600, 82),
    "tool": (900, 84),
    "brand": (1800, 88),
}


def main():
    converted = 0
    original_bytes = 0
    output_bytes = 0

    for folder, (limit, quality) in LIMITS.items():
        base = PUBLIC / folder
        if not base.exists():
            continue

        for source in base.rglob("*"):
            if source.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue

            target = source.with_suffix(".webp")
            with Image.open(source) as opened:
                image = ImageOps.exif_transpose(opened)
                has_alpha = (
                    image.mode in {"RGBA", "LA"}
                    or "transparency" in image.info
                )
                image.thumbnail((limit, limit), Image.Resampling.LANCZOS)

                if has_alpha:
                    image.save(
                        target,
                        "WEBP",
                        quality=quality,
                        method=6,
                        alpha_quality=92,
                    )
                else:
                    image.convert("RGB").save(
                        target,
                        "WEBP",
                        quality=quality,
                        method=6,
                    )

            converted += 1
            original_bytes += source.stat().st_size
            output_bytes += target.stat().st_size

    mascot_source = PUBLIC / "carrot-mascot.png"
    if mascot_source.exists():
        mascot_target = mascot_source.with_suffix(".webp")
        with Image.open(mascot_source) as opened:
            image = ImageOps.exif_transpose(opened)
            image.thumbnail((512, 512), Image.Resampling.LANCZOS)
            image.save(
                mascot_target,
                "WEBP",
                quality=84,
                method=6,
                alpha_quality=92,
            )
        converted += 1
        original_bytes += mascot_source.stat().st_size
        output_bytes += mascot_target.stat().st_size

    saved = original_bytes - output_bytes
    ratio = output_bytes / original_bytes * 100 if original_bytes else 0
    print(f"Converted {converted} images")
    print(
        f"{original_bytes / 1024 / 1024:.2f} MB -> "
        f"{output_bytes / 1024 / 1024:.2f} MB"
    )
    print(f"Saved {saved / 1024 / 1024:.2f} MB ({100 - ratio:.1f}%)")


if __name__ == "__main__":
    main()
