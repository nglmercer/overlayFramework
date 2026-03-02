import { z } from 'zod';

// Animation Types
export const AnimationTypeSchema = z.enum(['fade', 'slide', 'scale', 'rotate', 'blur', 'flip', 'bounce', 'zoom', 'custom']);
export type AnimationType = z.infer<typeof AnimationTypeSchema>;

// Direction
export const DirectionSchema = z.enum(['up', 'down', 'left', 'right', 'center']);
export type Direction = z.infer<typeof DirectionSchema>;

// Easing Functions
export const EasingSchema = z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut', 'backIn', 'backOut', 'anticipate', 'custom']);
export type Easing = z.infer<typeof EasingSchema>;

// Keyframe Point for custom progression
export const KeyframePointSchema = z.object({
  id: z.string(),
  time: z.number(), // 0 to 100 (%)
  value: z.number(), // Normalized value (usually 0 to 1 or -100 to 100)
});
export type KeyframePoint = z.infer<typeof KeyframePointSchema>;

// Full Animation Configuration
export const AnimationConfigSchema = z.object({
  type: AnimationTypeSchema,
  direction: DirectionSchema,
  duration: z.number(),
  delay: z.number(),
  distance: z.number(),
  scale: z.number(),
  rotate: z.number(),
  opacity: z.number(),
  blur: z.number(),
  easing: EasingSchema,
  keyframes: z.array(KeyframePointSchema), // Custom progression curve
});
export type AnimationConfig = z.infer<typeof AnimationConfigSchema>;

// App State for the animation editor
export const AppStateSchema = z.object({
  entrance: AnimationConfigSchema,
  exit: AnimationConfigSchema,
  previewText: z.string(),
  previewType: z.enum(['box', 'text', 'image']),
  activeTab: z.enum(['entrance', 'exit']),
});
export type AppState = z.infer<typeof AppStateSchema>;

// Default animation configs
export const defaultAnimationConfig: AnimationConfig = {
  type: 'fade',
  direction: 'center',
  duration: 300,
  delay: 0,
  distance: 100,
  scale: 1,
  rotate: 0,
  opacity: 1,
  blur: 0,
  easing: 'easeOut',
  keyframes: [],
};

export const defaultAppState: AppState = {
  entrance: { ...defaultAnimationConfig },
  exit: { ...defaultAnimationConfig },
  previewText: 'Preview',
  previewType: 'box',
  activeTab: 'entrance',
};

// Animation type options for UI
export const animationTypeOptions: { value: AnimationType; label: string }[] = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'scale', label: 'Scale' },
  { value: 'rotate', label: 'Rotate' },
  { value: 'blur', label: 'Blur' },
  { value: 'flip', label: 'Flip' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'custom', label: 'Custom' },
];

// Direction options for UI
export const directionOptions: { value: Direction; label: string }[] = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'center', label: 'Center' },
];

// Easing options for UI
export const easingOptions: { value: Easing; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In Out' },
  { value: 'backIn', label: 'Back In' },
  { value: 'backOut', label: 'Back Out' },
  { value: 'anticipate', label: 'Anticipate' },
  { value: 'custom', label: 'Custom' },
];

// Entrance animation presets (legacy compatibility)
export const entranceAnimationPresets: { value: string; label: string }[] = [
  { value: 'fade-in', label: 'Fade In' },
  { value: 'slide-in-up', label: 'Slide In Up' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'bounce-in', label: 'Bounce In' },
];

// Exit animation presets (legacy compatibility)
export const exitAnimationPresets: { value: string; label: string }[] = [
  { value: 'fade-out', label: 'Fade Out' },
  { value: 'slide-out-down', label: 'Slide Out Down' },
  { value: 'zoom-out', label: 'Zoom Out' },
];
