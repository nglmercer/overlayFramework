export interface EventVariable {
  name: string;
  description: string;
}

export interface PlatformEventDefinition {
  id: string;
  label: string;
  conditionLabel: string;
  variables: EventVariable[];
  defaultMessage: string;
}

// Ensure the schema is explicitly provided by the implementing application context
export const platformEventsSchema: PlatformEventDefinition[] = [];
