export type RegionKind = 'heading' | 'text' | 'card' | 'media' | 'chart';

export interface SlideRegion {
  id: string;
  label: string;
  /** Normalized coordinates [0..1] relative to 16:9 slide width/height */
  x: number;
  y: number;
  width: number;
  height: number;
  kind: RegionKind;
  order: number;
}

export type BlockType = 'text' | 'image' | 'shape';

export interface SlideBlock {
  id: string;
  type: BlockType;
  label: string;
  /** Normalized [0..1] relative to 1920x1080 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Text content for 'text' or 'shape' blocks */
  text?: string;
  /** Font size in 1920x1080 virtual pixels */
  fontSize?: number;
  fontWeight?: '400' | '600' | '700';
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;
  /** Image URL or Data URL for 'image' blocks */
  imageUrl?: string;
}

export interface SlideBackground {
  color: string;
  gradientTo?: string;
  imageUrl?: string;
}

export interface EditableSlide {
  id: string;
  title: string;
  background: SlideBackground;
  blocks: SlideBlock[];
}

export interface EditableDeck {
  id: string;
  title: string;
  slides: EditableSlide[];
  updatedAt: number;
}

export type AppMode = 'edit' | 'present';
export type CursorMode = 'swarm' | 'minimal';
export type BuildSpeed = 'fast' | 'normal' | 'slow';
export type OverlayMode = 'active' | 'dimmed' | 'hidden';
export type SwarmPhase = 'idle' | 'building' | 'settling' | 'settled';
