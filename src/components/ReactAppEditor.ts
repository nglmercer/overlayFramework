import * as React from 'react';
import { createComponent } from '@lit/react';
import { AppEditor } from './Editor';

export const ReactAppEditor = createComponent({
  tagName: 'app-editor',
  elementClass: AppEditor,
  react: React,
  events: {
    onBack: 'onBack',
  },
});
