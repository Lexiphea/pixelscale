import io
import logging
from pathlib import Path

from PIL import Image as PILImage
from PIL import ImageEnhance, ImageFilter, ImageOps

from ..config import get_settings
from ..schemas import FilterType, ImageFormat, ImageProcessingOptions
from .s3 import download_file_from_s3, get_public_url, upload_file_to_s3

logger = logging.getLogger(__name__)
settings = get_settings()

PRESET_SIZES = {
    "thumbnail": (150, 150),
    "medium": (800, 800),
    "large": (1920, 1920),
}


def process_image(
    raw_key: str,
    options: ImageProcessingOptions | None = None,
    size: str | None = None,
) -> tuple[str, str] | None:
    if options is None:
        options = ImageProcessingOptions()
        if size:
            options.preset = size

    raw_content = download_file_from_s3(settings.s3_bucket_raw, raw_key)
    if not raw_content:
        logger.error(f"Failed to download raw image: {raw_key}")
        return None

    try:
        img = PILImage.open(io.BytesIO(raw_content))

        if img.mode in ("RGBA", "P") and options.format == ImageFormat.JPEG:
            img = img.convert("RGB")
        elif img.mode != "RGBA" and options.format == ImageFormat.PNG:
            img = img.convert("RGBA")

        img = _apply_crop(img, options)
        img = _apply_resize(img, options)
        img = _apply_transformations(img, options)
        img = _apply_filters(img, options)
        img = _apply_adjustments(img, options)

        output_buffer = io.BytesIO()
        save_format = options.format.value.upper()
        if save_format == "JPEG":
            img.save(output_buffer, format="JPEG", quality=options.quality, optimize=True)
        elif save_format == "PNG":
            img.save(output_buffer, format="PNG", optimize=True)
        elif save_format == "WEBP":
            img.save(output_buffer, format="WEBP", quality=options.quality)

        processed_content = output_buffer.getvalue()
        processed_key = _generate_processed_key(raw_key, options)

        success = upload_file_to_s3(
            processed_content,
            settings.s3_bucket_processed,
            processed_key,
            content_type=f"image/{options.format.value}",
        )

        if success:
            url = get_public_url(settings.s3_bucket_processed, processed_key)
            return processed_key, url

        return None

    except Exception as e:
        logger.error(f"Failed to process image {raw_key}: {e}")
        return None


def _apply_crop(img: PILImage.Image, options: ImageProcessingOptions) -> PILImage.Image:
    if all(v is not None for v in [options.crop_x, options.crop_y, options.crop_width, options.crop_height]):
        left = options.crop_x
        top = options.crop_y
        right = left + options.crop_width
        bottom = top + options.crop_height
        right = min(right, img.width)
        bottom = min(bottom, img.height)
        img = img.crop((left, top, right, bottom))
    return img


def _apply_resize(img: PILImage.Image, options: ImageProcessingOptions) -> PILImage.Image:
    target_size = None

    if options.preset and options.preset in PRESET_SIZES:
        target_size = PRESET_SIZES[options.preset]
    elif options.width or options.height:
        if options.maintain_aspect:
            if options.width and options.height:
                target_size = (options.width, options.height)
            elif options.width:
                ratio = options.width / img.width
                target_size = (options.width, int(img.height * ratio))
            else:
                ratio = options.height / img.height
                target_size = (int(img.width * ratio), options.height)
        else:
            w = options.width or img.width
            h = options.height or img.height
            return img.resize((w, h), PILImage.Resampling.LANCZOS)

    if target_size:
        if options.maintain_aspect or options.preset:
            img.thumbnail(target_size, PILImage.Resampling.LANCZOS)
        else:
            img = img.resize(target_size, PILImage.Resampling.LANCZOS)

    return img


def _apply_transformations(img: PILImage.Image, options: ImageProcessingOptions) -> PILImage.Image:
    if options.rotate:
        img = img.rotate(-options.rotate, expand=True, resample=PILImage.Resampling.BICUBIC)

    if options.flip_horizontal:
        img = ImageOps.mirror(img)

    if options.flip_vertical:
        img = ImageOps.flip(img)

    return img


def _apply_filters(img: PILImage.Image, options: ImageProcessingOptions) -> PILImage.Image:
    if options.filter == FilterType.GRAYSCALE:
        img = ImageOps.grayscale(img)
        if options.format != ImageFormat.PNG:
            img = img.convert("RGB")
    elif options.filter == FilterType.SEPIA:
        img = _apply_sepia(img)
    elif options.filter == FilterType.BLUR:
        img = img.filter(ImageFilter.GaussianBlur(radius=2))
    elif options.filter == FilterType.SHARPEN:
        img = img.filter(ImageFilter.SHARPEN)
    elif options.filter == FilterType.CONTOUR:
        img = img.filter(ImageFilter.CONTOUR)
    elif options.filter == FilterType.EMBOSS:
        img = img.filter(ImageFilter.EMBOSS)

    return img


def _apply_sepia(img: PILImage.Image) -> PILImage.Image:
    import numpy as np

    if img.mode != "RGB":
        img = img.convert("RGB")

    arr = np.array(img, dtype=np.float32)
    sepia_matrix = np.array([
        [0.393, 0.769, 0.189],
        [0.349, 0.686, 0.168],
        [0.272, 0.534, 0.131],
    ])
    sepia = arr @ sepia_matrix.T
    sepia = np.clip(sepia, 0, 255).astype(np.uint8)
    return PILImage.fromarray(sepia)


def _apply_adjustments(img: PILImage.Image, options: ImageProcessingOptions) -> PILImage.Image:
    if img.mode == "L":
        img = img.convert("RGB")

    if options.brightness != 0:
        factor = 1 + (options.brightness / 100)
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(factor)

    if options.contrast != 0:
        factor = 1 + (options.contrast / 100)
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(factor)

    if options.saturation != 0:
        factor = 1 + (options.saturation / 100)
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(factor)

    return img


def _generate_processed_key(raw_key: str, options: ImageProcessingOptions) -> str:
    path = Path(raw_key)
    stem = path.stem

    size_suffix = options.preset or "custom"
    ext = options.format.value

    return f"processed/{size_suffix}/{stem}.{ext}"
