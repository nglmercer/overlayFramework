import { Renderer } from './core/renderer';
import { Template } from './core/types';

const root = document.getElementById('render-root');
if (root) {
  const renderer = new Renderer(root);

  // Listen for messages from the dashboard
  window.addEventListener('message', (event) => {
    // Basic security check (optional, but good practice)
    // if (event.origin !== window.location.origin) return;

    const { type, payload } = event.data;

    if (type === 'UPDATE_TEMPLATE') {
      const template = payload as Template;
      renderer.render(template);
    }
  });

  // Signal that we are ready
  window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
}
