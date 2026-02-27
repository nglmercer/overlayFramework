import { 
  Template as ZTemplate, 
  TemplateElement as ZTemplateElement,
  BaseElementSchema,
  TextElementSchema,
  MediaElementSchema,
  BoxElementSchema,
  MultimediaElementSchema
} from './schemas';
import { z } from 'zod';

export type Template = ZTemplate;
export type TemplateElement = ZTemplateElement;

export type ElementType = z.infer<typeof BaseElementSchema>['type'];

export type BaseElement = z.infer<typeof BaseElementSchema>;
export type TextElement = z.infer<typeof TextElementSchema>;
export type MediaElement = z.infer<typeof MediaElementSchema>;
export type BoxElement = z.infer<typeof BoxElementSchema>;
export type MultimediaElement = z.infer<typeof MultimediaElementSchema>;

export interface MediaHandler {
  id: string;
  name: string;
  pattern: string; // e.g., "streamloots://*"
  parse: (url: string) => string;
}
