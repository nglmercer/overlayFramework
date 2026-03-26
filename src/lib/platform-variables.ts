/**
 * Platform Variables - Sistema de Autocompletado Dinámico
 * 
 * Sistema agnóstico de plataformas donde el usuario sube un objeto JSON de ejemplo
 * y eso genera el autocompletado automáticamente.
 * 
 * No hay schemas, tipos o validaciones - solo datos dinámicos.
 * 
 * @module lib/platform-variables
 * @version 2.0.0
 */

/**
 * Variable extraída del objeto JSON del usuario
 */
export interface DynamicVariable {
  /** Ruta de la variable en el objeto (ej: 'content', 'comment', 'sender.username') */
  path: string;
  /** Nombre para mostrar en el autocompletado */
  name: string;
  /** Ruta en formato platform (ej: 'data.content') */
  platformPath: string;
  /** Descripción automática basada en la ruta */
  description: string;
  /** Valor de ejemplo del objeto JSON */
  exampleValue?: unknown;
}

/**
 * Grupo de variables por categoría
 */
export interface VariableGroup {
  category: string;
  label: string;
  variables: DynamicVariable[];
}

/**
 * Registry de objetos de ejemplo por plataforma
 * El usuario puede subir su propio objeto JSON para autocompletado
 */
const sampleObjects: Record<string, Record<string, unknown>> = {};

/**
 * Configuración de平台的默认值
 */
const defaultSamples: Record<string, Record<string, unknown>> = {
  kick: {
    sender: { username: 'KickUser', user_id: '12345' },
    content: 'Hola desde Kick!',
    timestamp: Date.now(),
  },
  tiktok: {
    uniqueId: 'TikTokUser',
    nickname: 'TikTok Nick',
    comment: 'Hola desde TikTok!',
    giftName: 'Rose',
    repeatCount: 1,
    timestamp: Date.now(),
  },
  twitch: {
    display_name: 'TwitchUser',
    content: 'Hola desde Twitch!',
    bits: 100,
    months: 1,
    tier: '1000',
  },
};

/**
 * Establece el objeto de ejemplo para una plataforma
 * El usuario puede subir su propio JSON para autocompletado personalizado
 * 
 * @param platform - Nombre de la plataforma (kick, tiktok, twitch, etc.)
 * @param sampleObject - Objeto JSON de ejemplo
 */
export function setPlatformSample(platform: string, sampleObject: Record<string, unknown>): void {
  sampleObjects[platform] = sampleObject;
  console.log(`[PlatformVariables] Sample set for platform: ${platform}`, sampleObject);
}

/**
 * Obtiene el objeto de ejemplo para una plataforma
 * 
 * @param platform - Nombre de la plataforma
 * @returns Objeto de ejemplo o undefined
 */
export function getPlatformSample(platform: string): Record<string, unknown> | undefined {
  return sampleObjects[platform] || defaultSamples[platform];
}

/**
 * Obtiene todas las plataformas disponibles
 */
export function getAvailablePlatforms(): string[] {
  const platforms = new Set<string>();
  
  // Agregar plataformas de samples personalizados
  Object.keys(sampleObjects).forEach(p => platforms.add(p));
  
  // Agregar plataformas por defecto
  Object.keys(defaultSamples).forEach(p => platforms.add(p));
  
  return Array.from(platforms);
}

/**
 * Extrae todas las rutas de un objeto de forma recursiva
 * 
 * @param obj - Objeto a analizar
 * @param prefix - Prefijo para las rutas
 * @returns Array de DynamicVariable
 */
function extractVariablesFromObject(obj: unknown, prefix: string = ''): DynamicVariable[] {
  const variables: DynamicVariable[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return variables;
  }
  
  const record = obj as Record<string, unknown>;
  
  for (const [key, value] of Object.entries(record)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    const platformPath = `data.${currentPath}`;
    
    // Agregar la variable actual
    variables.push({
      path: currentPath,
      name: key,
      platformPath,
      description: getDescriptionForPath(key, value),
      exampleValue: value,
    });
    
    // Si es un objeto anidado, explorar recursivamente
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      variables.push(...extractVariablesFromObject(value, currentPath));
    }
  }
  
  return variables;
}

/**
 * Genera una descripción basada en la ruta y el valor
 */
function getDescriptionForPath(path: string, value: unknown): string {
  // Descripciones comunes para rutas conocidas
  const descriptions: Record<string, string> = {
    content: 'Contenido del mensaje',
    comment: 'Comentario del usuario',
    message: 'Mensaje del chat',
    username: 'Nombre de usuario',
    display_name: 'Nombre visible del usuario',
    uniqueId: 'ID único de usuario',
    nickname: 'Apodo del usuario',
    sender: 'Información del remitente',
    user: 'Información del usuario',
    giftName: 'Nombre del regalo',
    amount: 'Cantidad',
    repeatCount: 'Cantidad de repeticiones',
    bits: 'Cantidad de bits',
    months: 'Meses de suscripción',
    tier: 'Nivel de suscripción',
    timestamp: 'Marca de tiempo',
  };
  
  // Buscar coincidencia exacta o parcial
  if (descriptions[path]) {
    return descriptions[path];
  }
  
  // Buscar coincidencia parcial
  for (const [key, desc] of Object.entries(descriptions)) {
    if (path.includes(key)) {
      return desc;
    }
  }
  
  // Si es primitivo, describir el tipo
  if (typeof value === 'string') {
    return `Texto: ${value.substring(0, 30)}`;
  }
  if (typeof value === 'number') {
    return `Número: ${value}`;
  }
  if (typeof value === 'boolean') {
    return `Booleano: ${value}`;
  }
  
  return `Variable '${path}'`;
}

/**
 * Obtiene las variables disponibles para una plataforma
 * 
 * @param platform - Nombre de la plataforma
 * @returns Array de variables dinámicas
 */
export function getPlatformVariables(platform: string): DynamicVariable[] {
  const sample = getPlatformSample(platform);
  
  if (!sample) {
    return [];
  }
  
  return extractVariablesFromObject(sample);
}

/**
 * Obtiene las variables agrupadas por categoría
 * 
 * @param platform - Nombre de la plataforma
 * @returns Array de grupos
 */
export function getPlatformVariableGroups(platform: string): VariableGroup[] {
  const variables = getPlatformVariables(platform);
  
  // Agrupar por categoría basée en la ruta
  const groups: Record<string, VariableGroup> = {};
  
  for (const variable of variables) {
    const parts = variable.path.split('.');
    const category = parts.length > 1 ? parts[0] : 'root';
    
    if (!groups[category]) {
      groups[category] = {
        category,
        label: capitalize(category),
        variables: [],
      };
    }
    
    groups[category].variables.push(variable);
  }
  
  return Object.values(groups);
}

/**
 * Capitaliza la primera letra
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Resuelve las variables en un template con los datos del evento
 * 
 * @param template - Template con variables $[data.xxx]
 * @param eventData - Datos del evento
 * @returns Template con variables reemplazadas
 */
export function resolveVariables(
  template: string, 
  eventData: Record<string, unknown>
): string {
  // Buscar todos los patrones $[data.xxx]
  return template.replace(/\$\[data\.(\w+(?:\.\w+)?)\]/g, (_, path) => {
    const parts = path.split('.');
    let value: unknown = eventData;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        value = undefined;
        break;
      }
    }
    
    return value !== undefined ? String(value) : `$[data.${path}]`;
  });
}

/**
 * Obtiene el regex para autocompletado de variables
 */
export function getVariablePattern(): RegExp {
  return /\$\[data\.\w+(?:\.\w+)?\]/g;
}

/**
 * Extrae todas las variables usadas en un template
 * 
 * @param template - Template a analizar
 * @returns Array de nombres de variables usadas
 */
export function extractVariablesFromTemplate(template: string): string[] {
  const pattern = /\$\[data\.(\w+(?:\.\w+)?)\]/g;
  const matches: string[] = [];
  let match;
  
  while ((match = pattern.exec(template)) !== null) {
    matches.push(match[1]);
  }
  
  return [...new Set(matches)];
}

/**
 * Obtiene un valor anidado de un objeto usando notación de punto
 * 
 * @param obj - Objeto
 * @param path - Ruta (ej: 'user.name')
 * @returns Valor o undefined
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let value: unknown = obj;
  
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Establece un valor anidado en un objeto usando notación de punto
 * 
 * @param obj - Objeto
 * @param path - Ruta (ej: 'user.name')
 * @param value - Valor a establecer
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  
  current[parts[parts.length - 1]] = value;
}
