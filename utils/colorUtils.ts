import { ColorStop } from '../types';

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

export const componentToHex = (c: number) => {
  const hex = Math.round(c).toString(16);
  return hex.length === 1 ? '0' + hex : hex;
};

export const rgbToHex = (r: number, g: number, b: number) => {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

// --- HSV Support for Custom Picker ---

export const hexToHsv = (hex: string) => {
  let { r, g, b } = hexToRgb(hex);
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  // Ensure h is 0-1 range for internal calcs if needed, but returning 0-360 is standard
  if (h < 0) h += 1;
  
  return { h: h * 360, s, v };
};

export const hsvToHex = (h: number, s: number, v: number) => {
  // h: 0-360, s: 0-1, v: 0-1
  let r = 0, g = 0, b = 0;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  );
};

// --- HSL Support for Suggestions ---

export const hexToHsl = (hex: string) => {
  let { r, g, b } = hexToRgb(hex);
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

export const hslToHex = (h: number, s: number, l: number) => {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return rgbToHex(r * 255, g * 255, b * 255);
};

// --- Suggestion Logic ---

export interface GradientSuggestion {
  name: string;
  category: string;
  stops: ColorStop[];
}

export const generateGradientSuggestions = (baseHex: string): GradientSuggestion[] => {
  const hsl = hexToHsl(baseHex);
  const suggestions: GradientSuggestion[] = [];
  const genId = () => Math.random().toString(36).substring(2, 9);

  const createStops = (startHex: string, endHex: string) => [
    { id: genId(), offset: 0, color: startHex },
    { id: genId(), offset: 1, color: endHex }
  ];

  // 1. Tints & Shades
  suggestions.push({
    name: 'Fade to White',
    category: 'Tints & Shades',
    stops: createStops(baseHex, '#ffffff')
  });
  suggestions.push({
    name: 'Fade from White',
    category: 'Tints & Shades',
    stops: createStops('#ffffff', baseHex)
  });
  suggestions.push({
    name: 'Fade to Black',
    category: 'Tints & Shades',
    stops: createStops(baseHex, '#000000')
  });
  suggestions.push({
    name: 'Fade from Black',
    category: 'Tints & Shades',
    stops: createStops('#000000', baseHex)
  });

  // 2. Luminosity Shifts
  const lighter = hslToHex(hsl.h, hsl.s, Math.min(95, hsl.l + 30));
  const darker = hslToHex(hsl.h, hsl.s, Math.max(5, hsl.l - 30));
  
  suggestions.push({
    name: 'To Lighter',
    category: 'Luminosity',
    stops: createStops(baseHex, lighter)
  });
  suggestions.push({
    name: 'To Darker',
    category: 'Luminosity',
    stops: createStops(baseHex, darker)
  });

  // 3. Color Harmonies
  
  // Analogous (approx +/- 30 degrees)
  const ana1 = hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l);
  const ana2 = hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l);
  
  suggestions.push({
    name: 'Analogous (Warm)',
    category: 'Harmonies',
    stops: createStops(baseHex, ana1)
  });
  suggestions.push({
    name: 'Analogous (Cool)',
    category: 'Harmonies',
    stops: createStops(baseHex, ana2)
  });

  // Complementary (180 degrees)
  const comp = hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l);
  suggestions.push({
    name: 'Complementary',
    category: 'Harmonies',
    stops: createStops(baseHex, comp)
  });

  // Split Complementary (150 & 210)
  const split1 = hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l);
  const split2 = hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l);

  suggestions.push({
    name: 'Split Comp. 1',
    category: 'Harmonies',
    stops: createStops(baseHex, split1)
  });
  suggestions.push({
    name: 'Split Comp. 2',
    category: 'Harmonies',
    stops: createStops(baseHex, split2)
  });
  
  // Triadic (120 & 240)
  const tri1 = hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l);
  
  suggestions.push({
    name: 'Triadic',
    category: 'Harmonies',
    stops: createStops(baseHex, tri1)
  });

  return suggestions;
};

// --- Existing Helpers ---

export const interpolateColor = (color1: string, color2: string, factor: number) => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = c1.r + factor * (c2.r - c1.r);
  const g = c1.g + factor * (c2.g - c1.g);
  const b = c1.b + factor * (c2.b - c1.b);

  return rgbToHex(r, g, b);
};

export const getGradientColor = (stops: ColorStop[], t: number): string => {
  if (stops.length === 0) return '#ffffff';
  if (stops.length === 1) return stops[0].color;

  // Sort stops by offset
  const sortedStops = [...stops].sort((a, b) => a.offset - b.offset);

  // Handle out of bounds
  if (t <= sortedStops[0].offset) return sortedStops[0].color;
  if (t >= sortedStops[sortedStops.length - 1].offset)
    return sortedStops[sortedStops.length - 1].color;

  // Find the two stops t is between
  for (let i = 0; i < sortedStops.length - 1; i++) {
    const s1 = sortedStops[i];
    const s2 = sortedStops[i + 1];

    if (t >= s1.offset && t <= s2.offset) {
      const range = s2.offset - s1.offset;
      const factor = range === 0 ? 0 : (t - s1.offset) / range;
      return interpolateColor(s1.color, s2.color, factor);
    }
  }

  return sortedStops[sortedStops.length - 1].color;
};

export const generateUUID = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const getColorHue = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  
  let h = 0;
  
  if (max === min) {
    h = 0;
  } else {
    const d = max - min;
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }
  return h;
};