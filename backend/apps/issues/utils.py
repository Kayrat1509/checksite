"""
Утилиты для работы с изображениями.
"""
import os
from io import BytesIO
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile
import pillow_heif


# Регистрируем поддержку HEIC/HEIF в Pillow
pillow_heif.register_heif_opener()


# Допустимые форматы изображений
ALLOWED_IMAGE_FORMATS = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/tiff',
    'image/webp'
]

# Соответствие MIME-типов расширениям
MIME_TO_EXT = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'image/webp': '.webp'
}


def convert_image_to_webp(uploaded_file, quality=85, max_dimension=2560):
    """
    Конвертирует загруженное изображение в формат WebP с оптимизацией.

    Args:
        uploaded_file: Загруженный файл (InMemoryUploadedFile или TemporaryUploadedFile)
        quality: Качество WebP изображения (0-100), по умолчанию 85
        max_dimension: Максимальная ширина или высота в пикселях, по умолчанию 2560

    Returns:
        InMemoryUploadedFile: Конвертированное изображение в формате WebP

    Raises:
        ValueError: Если формат изображения не поддерживается
    """

    # Проверяем формат файла (только если content_type доступен)
    # При загрузке через API - есть content_type
    # При вызове из модели save() - может не быть content_type
    if hasattr(uploaded_file, 'content_type'):
        content_type = uploaded_file.content_type
        if content_type not in ALLOWED_IMAGE_FORMATS:
            raise ValueError(
                f"Неподдерживаемый формат изображения: {content_type}. "
                f"Допустимые форматы: {', '.join(ALLOWED_IMAGE_FORMATS)}"
            )

    try:
        # Открываем изображение с помощью Pillow
        # Pillow автоматически использует pillow_heif для HEIC/HEIF
        image = Image.open(uploaded_file)

        # Конвертируем в RGB если изображение в другом режиме
        # WebP лучше всего работает с RGB
        if image.mode in ('RGBA', 'LA', 'P'):
            # Для изображений с прозрачностью создаем белый фон
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')

        # Поворачиваем изображение согласно EXIF ориентации
        try:
            from PIL import ImageOps
            image = ImageOps.exif_transpose(image)
        except Exception:
            # Если не удалось обработать EXIF, продолжаем без поворота
            pass

        # Изменяем размер изображения если оно слишком большое
        width, height = image.size
        if width > max_dimension or height > max_dimension:
            # Вычисляем новые размеры с сохранением пропорций
            if width > height:
                new_width = max_dimension
                new_height = int((max_dimension / width) * height)
            else:
                new_height = max_dimension
                new_width = int((max_dimension / height) * width)

            # Используем LANCZOS для качественного ресайза
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Создаем буфер для сохранения WebP
        output = BytesIO()

        # Сохраняем изображение в формат WebP
        image.save(
            output,
            format='WEBP',
            quality=quality,
            method=6  # Метод сжатия (0-6, где 6 - самый качественный но медленный)
        )

        # Перемещаем указатель в начало буфера
        output.seek(0)

        # Получаем исходное имя файла и меняем расширение на .webp
        original_name = uploaded_file.name if hasattr(uploaded_file, 'name') else 'image.webp'
        name_without_ext = os.path.splitext(original_name)[0]
        new_filename = f"{name_without_ext}.webp"

        # Получаем field_name если доступен, иначе используем 'photo'
        field_name = uploaded_file.field_name if hasattr(uploaded_file, 'field_name') else 'photo'

        # Создаем новый InMemoryUploadedFile с WebP изображением
        webp_file = InMemoryUploadedFile(
            file=output,
            field_name=field_name,
            name=new_filename,
            content_type='image/webp',
            size=output.getbuffer().nbytes,
            charset=None
        )

        return webp_file

    except Exception as e:
        raise ValueError(f"Ошибка при конвертации изображения: {str(e)}")
    finally:
        # Закрываем исходный файл для освобождения памяти
        if hasattr(uploaded_file, 'close'):
            uploaded_file.close()


def validate_image_format(uploaded_file):
    """
    Проверяет, является ли загруженный файл изображением поддерживаемого формата.

    Args:
        uploaded_file: Загруженный файл

    Returns:
        bool: True если формат поддерживается, иначе False
    """
    # Проверяем наличие content_type
    if hasattr(uploaded_file, 'content_type'):
        content_type = uploaded_file.content_type
        return content_type in ALLOWED_IMAGE_FORMATS

    # Если content_type недоступен, проверяем по расширению файла
    if hasattr(uploaded_file, 'name'):
        import mimetypes
        content_type, _ = mimetypes.guess_type(uploaded_file.name)
        if content_type:
            return content_type in ALLOWED_IMAGE_FORMATS

    # По умолчанию разрешаем (Pillow сам проверит при открытии)
    return True


def get_image_info(uploaded_file):
    """
    Получает информацию об изображении (размер, формат и т.д.).

    Args:
        uploaded_file: Загруженный файл

    Returns:
        dict: Информация об изображении
    """
    try:
        image = Image.open(uploaded_file)
        info = {
            'width': image.width,
            'height': image.height,
            'format': image.format,
            'mode': image.mode,
            'size_bytes': uploaded_file.size
        }
        # Возвращаем указатель файла в начало
        uploaded_file.seek(0)
        return info
    except Exception as e:
        return {'error': str(e)}
