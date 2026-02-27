import { GymSettings } from '../../context/ThemeContext';

export const toSafeHex = (color: string): string => {
    if (!color || typeof color !== 'string') return '#00000000';
    if (color.startsWith('#')) return color;
    if (color.startsWith('rgba') || color.startsWith('rgb')) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
            const r = parseInt(match[1]).toString(16).padStart(2, '0');
            const g = parseInt(match[2]).toString(16).padStart(2, '0');
            const b = parseInt(match[3]).toString(16).padStart(2, '0');
            const a = match[4] ? Math.round(parseFloat(match[4]) * 255).toString(16).padStart(2, '0') : 'ff';
            return `#${r}${g}${b}${a}`;
        }
    }
    return color;
};

export const hexToRgba = (hex: string) => {
    if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0, a: 1 };
    if (hex.startsWith('rgba')) {
        const match = hex.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (match) return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]), a: parseFloat(match[4]) };
    }
    if (hex.startsWith('rgb')) {
        const match = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]), a: 1 };
    }
    let r = 0, g = 0, b = 0, a = 1;
    if (hex.match(/^#?[0-9a-f]{6}$/i)) {
        const h = hex.startsWith('#') ? hex.slice(1) : hex;
        r = parseInt(h.slice(0, 2), 16);
        g = parseInt(h.slice(2, 4), 16);
        b = parseInt(h.slice(4, 6), 16);
    } else if (hex.match(/^#?[0-9a-f]{8}$/i)) {
        const h = hex.startsWith('#') ? hex.slice(1) : hex;
        r = parseInt(h.slice(0, 2), 16);
        g = parseInt(h.slice(2, 4), 16);
        b = parseInt(h.slice(4, 6), 16);
        a = Math.round((parseInt(h.slice(6, 8), 16) / 255) * 100) / 100;
    }
    return { r, g, b, a };
};

export const rgbaToHex8 = (r: number, g: number, b: number, a: number) => {
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    const alphaHex = toHex(a * 255);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;
};

export const stripAlpha = (hex: string) => {
    if (!hex || typeof hex !== 'string') return '#000000';
    const s = toSafeHex(hex);
    return s.length === 9 || s.length === 8 ? s.slice(0, 7) : s;
};

export const lum = (hex: string) => {
    try {
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return 0;
        const c = hex.substring(1);
        const rgb = parseInt(c, 16);
        if (isNaN(rgb)) return 0;
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        const uR = r / 255, uG = g / 255, uB = b / 255;
        return 0.2126 * (uR <= 0.03928 ? uR / 12.92 : Math.pow((uR + 0.055) / 1.055, 2.4)) +
            0.7152 * (uG <= 0.03928 ? uG / 12.92 : Math.pow((uG + 0.055) / 1.055, 2.4)) +
            0.0722 * (uB <= 0.03928 ? uB / 12.92 : Math.pow((uB + 0.055) / 1.055, 2.4));
    } catch { return 0; }
};

export const animateColor = (rgb: number[], factor: number): number[] => {
    return rgb.map(c => Math.max(0, Math.min(255, Math.floor(c * factor))));
};

/**
 * Extracts dominant colors from an image URL using canvas
 */
export const getDominantColors = (url: string): Promise<{ primary: string; secondary: string }> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve({ primary: '#A30000', secondary: '#0B120F' });
                return;
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                const colors: Record<string, number> = {};

                // Sample pixels (every 10th for performance)
                for (let i = 0; i < imageData.length; i += 40) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];
                    const a = imageData[i + 3];

                    if (a < 128) continue; // Skip transparent

                    // Group similar colors by rounding
                    const key = `${Math.floor(r / 15) * 15},${Math.floor(g / 15) * 15},${Math.floor(b / 15) * 15}`;
                    colors[key] = (colors[key] || 0) + 1;
                }

                const sortedColors = Object.entries(colors)
                    .sort((a, b) => b[1] - a[1])
                    .map(c => c[0].split(',').map(Number));

                if (sortedColors.length === 0) {
                    resolve({ primary: '#A30000', secondary: '#0B120F' });
                    return;
                }

                const toHex = (rgb: number[]) => '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');

                const primary = toHex(sortedColors[0]);
                // Find a secondary color that is different enough
                let secondary = sortedColors[1] ? animateColor(sortedColors[1], 0.2) : animateColor(sortedColors[0], 0.1);

                resolve({
                    primary: primary,
                    secondary: toHex(secondary)
                });
            } catch (e) {
                console.error("Color extraction failed:", e);
                resolve({ primary: '#A30000', secondary: '#0B120F' });
            }
        };

        img.onerror = () => {
            resolve({ primary: '#A30000', secondary: '#0B120F' });
        };
    });
};
