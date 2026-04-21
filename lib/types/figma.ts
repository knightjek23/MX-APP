// Minimal Figma REST API types — only the fields Legible consumes.
// Full reference: https://www.figma.com/developers/api

export type FigmaNodeType =
  | "DOCUMENT"
  | "CANVAS"
  | "FRAME"
  | "GROUP"
  | "VECTOR"
  | "BOOLEAN_OPERATION"
  | "STAR"
  | "LINE"
  | "ELLIPSE"
  | "REGULAR_POLYGON"
  | "RECTANGLE"
  | "TEXT"
  | "SLICE"
  | "COMPONENT"
  | "COMPONENT_SET"
  | "INSTANCE"
  | "STICKY"
  | "SHAPE_WITH_TEXT"
  | "CONNECTOR"
  | "SECTION";

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaPaint {
  type:
    | "SOLID"
    | "GRADIENT_LINEAR"
    | "GRADIENT_RADIAL"
    | "GRADIENT_ANGULAR"
    | "GRADIENT_DIAMOND"
    | "IMAGE"
    | "EMOJI";
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  imageRef?: string;
}

export interface FigmaTypeStyle {
  fontFamily?: string;
  fontPostScriptName?: string;
  fontWeight?: number;
  fontSize?: number;
  lineHeightPx?: number;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  visible?: boolean;
  opacity?: number;
  children?: FigmaNode[];
  // TEXT-specific
  characters?: string;
  style?: FigmaTypeStyle;
  // Fill / stroke
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  // Layout
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  // Components
  componentId?: string;
  // Permit extra fields returned by the API without fighting the type system.
  [key: string]: unknown;
}

// Response shape of GET /v1/files/:key
export interface FigmaFile {
  name: string;
  role: string;
  lastModified: string;
  editorType: string;
  thumbnailUrl?: string;
  version: string;
  document: FigmaNode;
  components: Record<string, { key: string; name: string; description: string }>;
  styles: Record<string, unknown>;
  schemaVersion: number;
}

// Response shape of GET /v1/files/:key/nodes?ids=...
export interface FigmaNodesResponse {
  name: string;
  lastModified: string;
  thumbnailUrl?: string;
  version: string;
  nodes: Record<
    string,
    {
      document: FigmaNode;
      components: Record<string, unknown>;
      styles: Record<string, unknown>;
      schemaVersion: number;
    }
  >;
}

// Internal aliases used by the service + compaction layer.
// CompactFigmaTree will be narrowed further in lib/compact.ts (Prompt 3).
export type FigmaTree = FigmaNode;
export type CompactFigmaTree = FigmaNode;
