import { z } from 'zod';

export const UnitSchema = z.union([
  z.number(), // defaults to px
  z.string().regex(/^-?\d+(\.\d+)?(px|%|vh|vw|em|rem|deg)?$/),
  z.literal('auto'),
]);

export type UnitValue = z.infer<typeof UnitSchema>;

export const ElementTypeSchema = z.enum(['text', 'image', 'video', 'box', 'multimedia', 'group']);

export const BaseElementSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: ElementTypeSchema,
  x: UnitSchema.default(0),
  y: UnitSchema.default(0),
  width: UnitSchema.default('auto'),
  height: UnitSchema.default('auto'),
  position: z.enum(['absolute', 'relative', 'fixed']).default('absolute'),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  zIndex: z.number().default(0),
  visible: z.boolean().default(true),
  className: z.string().optional(),
  style: z.record(z.string(), z.string()).optional(),
});

export const TextElementSchema = BaseElementSchema.extend({
  type: z.literal('text'),
  content: z.string().default(''),
  fontSize: UnitSchema.default(16),
  fontFamily: z.string().default('Inter, sans-serif'),
  fontWeight: z.string().default('normal'),
  color: z.string().default('#ffffff'),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  lineHeight: UnitSchema.optional(),
  letterSpacing: UnitSchema.optional(),
  textShadow: z.string().optional(),
});

export const MediaElementSchema = BaseElementSchema.extend({
  type: z.enum(['image', 'video']),
  url: z.string().min(1),
  volume: z.number().min(0).max(100).default(100),
  loop: z.boolean().default(false),
  objectFit: z.enum(['contain', 'cover', 'fill', 'none']).default('contain'),
});

export const BoxElementSchema = BaseElementSchema.extend({
  type: z.literal('box'),
  backgroundColor: z.string().default('rgba(255,255,255,0.1)'),
  borderRadius: UnitSchema.default(0),
  borderWidth: UnitSchema.default(0),
  borderColor: z.string().default('transparent'),
  backdropFilter: z.string().optional(),
  boxShadow: z.string().optional(),
});

export const MultimediaElementSchema = BaseElementSchema.extend({
  type: z.literal('multimedia'),
  url: z.string().min(1),
  autoPlay: z.boolean().default(true),
  loop: z.boolean().default(false),
  volume: z.number().default(100),
});

// Definition for recursive group structure
export type TemplateElement = 
  | z.infer<typeof TextElementSchema>
  | z.infer<typeof MediaElementSchema>
  | z.infer<typeof BoxElementSchema>
  | z.infer<typeof MultimediaElementSchema>
  | GroupElement;

export type GroupElement = z.infer<typeof BaseElementSchema> & {
  type: 'group';
  elements: TemplateElement[];
};

export const GroupElementSchema: z.ZodType<GroupElement> = BaseElementSchema.extend({
  type: z.literal('group'),
  elements: z.lazy(() => z.array(TemplateElementSchema)).default([]),
});

export const TemplateElementSchema: z.ZodType<TemplateElement> = z.union([
  TextElementSchema,
  MediaElementSchema,
  BoxElementSchema,
  MultimediaElementSchema,
  GroupElementSchema,
]);

export const TemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  width: UnitSchema.default('100%'),
  height: UnitSchema.default('100%'),
  elements: z.array(TemplateElementSchema).default([]),
  backgroundColor: z.string().default('transparent'),
  perspective: z.string().optional(),
});

export type Template = z.infer<typeof TemplateSchema>;
