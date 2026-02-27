import * as React from 'react';
import { createComponent } from '@lit/react';
import { AppEditor } from './Editor';
import { getLocale, setLocale, LocalizeController } from '../locales/localization';

export const ReactAppEditor = createComponent({
  tagName: 'app-editor',
  elementClass: AppEditor,
  react: React,
  events: {
    onBack: 'onBack',
  },
});
