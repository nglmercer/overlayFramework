import { PlatformEventDefinition } from './alertEvents';

export const twitchEventsSchema: PlatformEventDefinition[] = [
  {
    id: 'seguimientos',
    label: 'Seguimientos',
    conditionLabel: 'Cualquier nuevo seguimiento',
    variables: [{ name: 'username', description: 'Nombre del usuario' }],
    defaultMessage: '¡{username} acaba de seguir!'
  },
  {
    id: 'suscripciones',
    label: 'Suscripciones',
    conditionLabel: 'Cualquier nueva suscripción',
    variables: [
      { name: 'username', description: 'Nombre del usuario' },
      { name: 'months', description: 'Meses suscrito' }
    ],
    defaultMessage: '¡{username} se ha suscrito por {months} meses!'
  },
  {
    id: 'bits',
    label: 'Bits',
    conditionLabel: 'Cualquier donación de bits',
    variables: [
      { name: 'username', description: 'Nombre del usuario' },
      { name: 'amount', description: 'Cantidad de bits' }
    ],
    defaultMessage: '¡{username} ha donado {amount} bits!'
  }
];
