export interface ColorStop {
  id: string;
  offset: number; // 0 to 1
  color: string; // Hex code
}

export type GradientType = 'solid' | 'linear-horizontal' | 'linear-vertical';

export interface PaletteItem {
  id: string;
  createdAt: number;
  type: GradientType;
  solidColor: string;
  gradientStops: ColorStop[];
}

export interface GridConfig {
  width: number;
  height: number;
  cellSize: number;
}

export interface SelectionBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
