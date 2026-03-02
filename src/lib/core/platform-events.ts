/**
 * Centralized Platform Event Definitions
 * 
 * This file serves as the single source of truth for all alert events supported by the framework.
 * It is used by both the frontend (schema-loader, UI) and the backend (WS, validation).
 * 
 * Each definition contains:
 * - Metadata (labels, default messages)
 * - Required & Optional fields for validation
 * - Dynamic variables for template substitution
 */

import { z } from 'zod';

/**
 * Event variable definition
 */
export const EventVariableSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
});

export type EventVariable = z.infer<typeof EventVariableSchema>;

/**
 * Platform Event Definition
 */
export const PlatformEventSchema = z.object({
  id: z.string(),
  label: z.string(),
  conditionLabel: z.string(),
  defaultMessage: z.string(),
  requiredFields: z.array(z.string()).default([]),
  optionalFields: z.array(z.string()).default([]),
  variables: z.array(EventVariableSchema).default([]),
});

export type PlatformEventDefinition = z.infer<typeof PlatformEventSchema>;

/**
 * CENTRALIZED EVENT REGISTRY
 */
export const PLATFORM_EVENTS: Record<string, PlatformEventDefinition> = {
  // --- KICK EVENTS ---
  'kick_chat': {
    id: 'kick_chat',
    label: 'Kick: Mensaje de Chat',
    conditionLabel: 'Cualquier mensaje en el chat de Kick',
    defaultMessage: '{username}: {message}',
    requiredFields: ['username', 'message'],
    optionalFields: ['timestamp', 'id', 'chatroom_id'],
    variables: [
      { name: 'username', description: 'Nombre del usuario que envió el mensaje' },
      { name: 'message', description: 'Contenido del mensaje' },
    ],
  },
  'kick_reward_redeemed': {
    id: 'kick_reward_redeemed',
    label: 'Kick: Recompensa Canjeada',
    conditionLabel: 'Cuando un usuario canjea una recompensa del canal en Kick',
    defaultMessage: '{username} canjeó {reward_title}!',
    requiredFields: ['username', 'reward_title'],
    optionalFields: ['user_id', 'channel_id', 'user_input', 'reward_background_color'],
    variables: [
      { name: 'username', description: 'Nombre del usuario que canjeó la recompensa' },
      { name: 'reward_title', description: 'Título de la recompensa canjeada' },
      { name: 'user_input', description: 'Entrada personalizada del usuario' },
    ],
  },

  // --- TIKTOK EVENTS ---
  'tiktok_chat': {
    id: 'tiktok_chat',
    label: 'TikTok: Mensaje de Chat',
    conditionLabel: 'Cualquier mensaje en el chat de TikTok',
    defaultMessage: '{username}: {message}',
    requiredFields: ['username', 'message'],
    optionalFields: ['timestamp', 'nickname', 'profilePictureUrl'],
    variables: [
      { name: 'username', description: 'ID de usuario de TikTok (@uniqueId)' },
      { name: 'message', description: 'Contenido del mensaje' },
      { name: 'nickname', description: 'Nombre visible del usuario' },
    ],
  },
  'tiktok_gift': {
    id: 'tiktok_gift',
    label: 'TikTok: Regalo',
    conditionLabel: 'Cualquier regalo recibido en TikTok',
    defaultMessage: '¡{username} envió {giftName} x{amount}!',
    requiredFields: ['username', 'giftName', 'amount'],
    optionalFields: ['timestamp', 'giftId', 'diamondCount', 'giftPictureUrl', 'nickname'],
    variables: [
      { name: 'username', description: 'ID de usuario de TikTok' },
      { name: 'giftName', description: 'Nombre del regalo enviado' },
      { name: 'amount', description: 'Cantidad de regalos enviados' },
      { name: 'diamondCount', description: 'Valor total en diamantes' },
    ],
  },
  'tiktok_social': {
    id: 'tiktok_social',
    label: 'TikTok: Seguimiento',
    conditionLabel: 'Nuevos seguidores en TikTok',
    defaultMessage: '¡{username} ahora te sigue en TikTok!',
    requiredFields: ['username'],
    optionalFields: ['timestamp', 'nickname', 'profilePictureUrl'],
    variables: [
      { name: 'username', description: 'ID de usuario de TikTok' },
      { name: 'nickname', description: 'Nombre visible del usuario' },
    ],
  },
};

/**
 * Helper to get all events as an array
 */
export const getAllPlatformEvents = (): PlatformEventDefinition[] => 
  Object.values(PLATFORM_EVENTS);

/**
 * Helper to get an event by ID
 */
export const getPlatformEventById = (id: string): PlatformEventDefinition | undefined => 
  PLATFORM_EVENTS[id];
