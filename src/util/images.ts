import _ from 'lodash';

/**
 * Identifies the type of image that a memory buffer holds.
 *
 * iOS Supported Image Formats: [PNG, TIFF, JPEG, GIF, BMP, Windows Icon, Windows Cursor, XWindow Bitmap]
 * https://developer.apple.com/library/content/documentation/2DDrawing/Conceptual/DrawingPrintingiOS/LoadingImages/LoadingImages.html
 *
 * Android Supported Image Formats: [BMP, GIF, JPEG, PNG, Google WebP Image]
 * https://developer.android.com/guide/topics/media/media-formats.html
 *
 * Magic Numbers:
 * https://en.wikipedia.org/wiki/List_of_file_signatures
 * http://www.garykessler.net/library/file_sigs.html
 */
const IMAGE_TYPES = [
    {
        format: 'Windows Bitmap (BMP)',
        ext: '.bmp',
        magic: [0x42, 0x4d] // BM
    },
    {
        format: 'Graphics Interchange Format (GIF)',
        ext: '.gif',
        magic: [0x47, 0x49, 0x46, 0x38] // GIF8
    },
    {
        format: 'JPEG File Interchange Format',
        ext: '.jpg',
        magic: [0xff, 0xd8, 0xff]
    },
    {
        format: 'Portable Network Graphics (PNG)',
        ext: '.png',
        magic: [0x89, 0x50, 0x4e, 0x47] // .PNG
    },
    {
        format: 'TIFF format (Motorola - big endian)',
        ext: '.tif',
        magic: [0x4d, 0x4d, 0x00, 0x2a] // MM.*
    },
    {
        format: 'TIFF format (Intel - little endian)',
        ext: '.tif',
        magic: [0x49, 0x49, 0x2a, 0x00] // II*.
    },
    {
        format: 'Windows Icon',
        ext: '.ico',
        magic: [0x00, 0x00, 0x01, 0x00]
    },
    {
        format: 'Windows Cursor',
        ext: '.cur',
        magic: [0x00, 0x00, 0x02, 0x00]
    },
    {
        format: 'Google WebP Image File',
        ext: '.webp',
        magic: [0x52, 0x49, 0x46, 0x46]  // RIFF
    }
];

const identifyImage = function identifyImage(buffer: Buffer) {
    for (let i = 0; i < IMAGE_TYPES.length; i++) {
        const imageType = IMAGE_TYPES[i];
        const buffArray = Array.from(buffer.slice(0, imageType.magic.length));
        if (_.isEqual(imageType.magic, buffArray)) {
            return imageType;
        }
    }

    return null;
};

export default identifyImage;