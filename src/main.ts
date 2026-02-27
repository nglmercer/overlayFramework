import './index.css';
import { dbManager } from './lib/db';
import { Template, TemplateElement } from './core/types';
import { Renderer } from './core/renderer';

class Dashboard {
  private currentTemplate: Template | null = null;
  private selectedElementId: string | null = null;

  constructor() {
    this.init();
  }

  async init() {
    console.log('Initializing Premium Overlay Dashboard...');
    const root = document.getElementById('root');
    if (!root) return;

    // Premium Layout setup
    root.innerHTML = `
      <div class="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-72 bg-zinc-900 border-r border-white/5 flex flex-col glass">
          <div class="p-6 border-b border-white/5">
            <h1 class="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Overlay Engine
            </h1>
            <p class="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mt-1 font-semibold">Pro Edition</p>
          </div>
          
          <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4" id="elements-list">
            <div>
              <h3 class="text-[10px] text-zinc-500 uppercase tracking-widest mb-3 px-2">Elements</h3>
              <div id="elements-container" class="space-y-1">
                <p class="text-zinc-600 text-xs px-2 py-4 italic">No elements yet</p>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-white/5 bg-zinc-900/50 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <button id="add-text" class="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/5 transition-all group">
                <span class="text-indigo-400 group-hover:scale-110 transition-transform mb-1">T</span>
                <span class="text-[10px] font-medium text-zinc-400">Text</span>
              </button>
              <button id="add-box" class="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/5 transition-all group">
                <span class="text-emerald-400 group-hover:scale-110 transition-transform mb-1">□</span>
                <span class="text-[10px] font-medium text-zinc-400">Box</span>
              </button>
              <button id="add-multimedia" class="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/5 transition-all group">
                <span class="text-purple-400 group-hover:scale-110 transition-transform mb-1">▷</span>
                <span class="text-[10px] font-medium text-zinc-400">Media</span>
              </button>
              <button id="add-group" class="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/5 transition-all group">
                <span class="text-amber-400 group-hover:scale-110 transition-transform mb-1">⚃</span>
                <span class="text-[10px] font-medium text-zinc-400">Group</span>
              </button>
            </div>
          </div>
        </aside>

        <!-- Main Canvas Area -->
        <main class="flex-1 flex flex-col bg-zinc-950">
          <header class="h-16 bg-zinc-900/50 border-b border-white/5 flex items-center justify-between px-8 glass">
            <div class="flex items-center gap-4">
               <input type="text" id="template-name" value="New Overlay" class="bg-transparent border-none focus:ring-0 text-sm font-semibold text-zinc-300 w-48">
            </div>
            <div class="flex items-center gap-3">
              <div class="h-8 w-px bg-white/5 mx-2"></div>
              <button id="save-btn" class="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-xs font-semibold shadow-sm transition-all hover:border-white/20">
                Save
              </button>
              <button id="preview-btn" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all">
                Preview
              </button>
            </div>
          </header>
          
          <div class="flex-1 overflow-auto bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:24px_24px] p-20 flex items-center justify-center">
             <div id="canvas-container" class="shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative bg-black overflow-hidden ring-1 ring-white/10">
                <!-- Sandbox Iframe -->
             </div>
          </div>
        </main>

        <!-- Right Properties Panel -->
        <aside class="w-80 bg-zinc-900 border-l border-white/5 p-6 glass overflow-y-auto custom-scrollbar" id="properties-panel">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Properties</h2>
            <button id="delete-element" class="text-zinc-600 hover:text-red-400 transition-colors text-xs hidden">Delete</button>
          </div>
          <div id="selected-element-properties" class="space-y-6">
            <div class="flex flex-col items-center justify-center py-20 text-center">
              <div class="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-zinc-600">i</div>
              <p class="text-zinc-500 text-xs">Select an element<br/>to edit properties</p>
            </div>
          </div>
        </aside>
      </div>
    `;

    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      // Setup Initial Template
      this.currentTemplate = {
        id: 'default-overlay',
        name: 'New Premium Overlay',
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
        elements: [
          {
            id: 'welcome-text',
            type: 'text',
            name: 'Welcome Label',
            x: '50%',
            y: '40%',
            width: 'auto',
            height: 'auto',
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            visible: true,
            position: 'absolute',
            style: { transform: 'translate(-50%, -50%)', textShadow: '0 4px 12px rgba(99, 102, 241, 0.5)' },
            content: 'PREMIUM OVERLAY',
            fontSize: 64,
            fontFamily: 'Outfit',
            fontWeight: '800',
            color: '#6366f1',
            textAlign: 'center'
          }
        ]
      };

      // Set container size
      canvasContainer.style.width = '1280px';
      canvasContainer.style.height = '720px';
      
      // Calculate zoom to fit
      this.rescaleCanvas();
      window.addEventListener('resize', () => this.rescaleCanvas());

      // Create Preview Iframe
      const iframe = document.createElement('iframe');
      iframe.src = '/preview.html';
      iframe.className = 'w-full h-full border-none pointer-events-none';
      iframe.id = 'preview-frame';
      canvasContainer.appendChild(iframe);

      this.renderElementsList();
      this.setupEventListeners();
      
      iframe.onload = () => {
        this.updatePreview();
        // Send a theme update or something if needed
      };
    }
  }

  rescaleCanvas() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    const parent = container.parentElement;
    if (!parent) return;

    const padding = 160;
    const availableWidth = parent.clientWidth - padding;
    const availableHeight = parent.clientHeight - padding;
    
    const scale = Math.min(availableWidth / 1280, availableHeight / 720, 1);
    container.style.transform = `scale(${scale})`;
  }

  renderElementsList() {
    const container = document.getElementById('elements-container');
    if (!container || !this.currentTemplate) return;

    if (this.currentTemplate.elements.length === 0) {
      container.innerHTML = '<p class="text-zinc-600 text-xs px-2 py-4 italic">No elements yet</p>';
      return;
    }

    container.innerHTML = this.currentTemplate.elements.map(el => `
      <div class="p-3 mb-1 rounded-xl cursor-pointer group flex items-center justify-between transition-all ${this.selectedElementId === el.id ? 'bg-indigo-600/20 ring-1 ring-indigo-500/50' : 'hover:bg-zinc-800'}" data-id="${el.id}">
        <div class="flex items-center gap-3">
          <div class="w-1.5 h-1.5 rounded-full ${this.selectedElementId === el.id ? 'bg-indigo-400' : 'bg-zinc-700'}"></div>
          <div>
            <div class="text-[11px] font-semibold text-zinc-200 truncate w-32">${el.name}</div>
            <div class="text-[9px] text-zinc-500 uppercase tracking-tighter">${el.type}</div>
          </div>
        </div>
        <div class="opacity-0 group-hover:opacity-100 transition-opacity">
           <svg class="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
    `).reverse().join('');

    container.querySelectorAll('[data-id]').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedElementId = item.getAttribute('data-id');
        this.renderElementsList();
        this.selectElement(this.selectedElementId);
      });
    });
  }

  selectElement(id: string | null) {
    const panel = document.getElementById('selected-element-properties');
    const deleteBtn = document.getElementById('delete-element');
    if (!panel || !this.currentTemplate) return;

    const element = this.currentTemplate.elements.find(e => e.id === id);
    if (!element) {
      panel.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-zinc-600">i</div>
          <p class="text-zinc-500 text-xs">Select an element<br/>to edit properties</p>
        </div>
      `;
      deleteBtn?.classList.add('hidden');
      return;
    }

    deleteBtn?.classList.remove('hidden');

    panel.innerHTML = `
      <div class="animate-fade-in space-y-6 pb-20">
        <section class="space-y-4">
          <h3 class="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">General</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-[10px] text-zinc-500 mb-1.5 ml-1">Name</label>
              <input type="text" value="${element.name}" class="w-full px-3 py-2 rounded-lg text-sm" id="prop-name">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] text-zinc-500 mb-1.5 ml-1">X Pos</label>
                <input type="text" value="${element.x}" class="w-full px-3 py-2 rounded-lg text-sm" id="prop-x">
              </div>
              <div>
                <label class="block text-[10px] text-zinc-500 mb-1.5 ml-1">Y Pos</label>
                <input type="text" value="${element.y}" class="w-full px-3 py-2 rounded-lg text-sm" id="prop-y">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] text-zinc-500 mb-1.5 ml-1">Width</label>
                <input type="text" value="${element.width}" class="w-full px-3 py-2 rounded-lg text-sm" id="prop-width">
              </div>
              <div>
                <label class="block text-[10px] text-zinc-500 mb-1.5 ml-1">Height</label>
                <input type="text" value="${element.height}" class="w-full px-3 py-2 rounded-lg text-sm" id="prop-height">
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-4">
          <h3 class="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Transform</h3>
          <div class="grid grid-cols-2 gap-3">
             <div>
                <label class="block text-[10px] text-zinc-500 mb-1.5 ml-1">Rotation</label>
                <input type="number" value="${element.rotation}" class="w-full px-3 py-2 rounded-lg text-sm" id="prop-rotation">
              </div>
              <div>
                <label class="block text-[10px] text-zinc-500 mb-1.5 ml-1">Opacity</label>
                <input type="number" step="0.1" min="0" max="1" value="${element.opacity}" class="w-full px-3 py-2 rounded-lg text-sm" id="prop-opacity">
              </div>
          </div>
          <div>
            <label class="block text-[10px] text-zinc-500 mb-1.5 ml-1">Position Type</label>
            <select class="w-full px-3 py-2 rounded-lg text-sm" id="prop-position">
              <option value="absolute" ${element.position === 'absolute' ? 'selected' : ''}>Absolute</option>
              <option value="relative" ${element.position === 'relative' ? 'selected' : ''}>Relative</option>
              <option value="fixed" ${element.position === 'fixed' ? 'selected' : ''}>Fixed (Screen)</option>
            </select>
          </div>
        </section>

        ${element.type === 'text' ? `
          <section class="space-y-4">
            <h3 class="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Typography</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-[10px] text-zinc-500 mb-1.5 ml-1">Content</label>
                <textarea class="w-full px-3 py-2 rounded-lg text-sm h-24" id="prop-content">${element.content}</textarea>
              </div>
              <div>
                <label class="block text-[10px] text-zinc-500 mb-1.5 ml-1">Font Size</label>
                <input type="text" value="${element.fontSize}" class="w-full px-3 py-2 rounded-lg text-sm" id="prop-fontSize">
              </div>
              <div class="flex items-center gap-2">
                <input type="color" value="${element.color}" class="h-8 w-8 rounded bg-transparent border-none cursor-pointer" id="prop-color">
                <input type="text" value="${element.color}" class="flex-1 px-3 py-1.5 rounded-lg text-xs" id="prop-color-text">
              </div>
            </div>
          </section>
        ` : ''}

        ${element.type === 'multimedia' || element.type === 'image' || element.type === 'video' ? `
          <section class="space-y-4">
            <h3 class="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Media</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-[10px] text-zinc-500 mb-1.5 ml-1">Source URL</label>
                <input type="text" value="${(element as any).url || ''}" class="w-full px-3 py-2 rounded-lg text-sm" id="prop-url">
              </div>
            </div>
          </section>
        ` : ''}
      </div>
    `;

    // Listeners for properties
    panel.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const prop = target.id.replace('prop-', '');
        
        if (target.type === 'number') {
          (element as any)[prop] = parseFloat(target.value) || 0;
        } else if (target.type === 'checkbox') {
          (element as any)[prop] = target.checked;
        } else {
          // Special case for color sync
          if (prop === 'color-text') {
            (element as any)['color'] = target.value;
            const picker = document.getElementById('prop-color') as HTMLInputElement;
            if (picker) picker.value = target.value;
          } else if (prop === 'color') {
            (element as any)['color'] = target.value;
            const text = document.getElementById('prop-color-text') as HTMLInputElement;
            if (text) text.value = target.value;
          } else {
            (element as any)[prop] = target.value;
          }
        }

        this.updatePreview();
      });
    });
  }

  updatePreview() {
    const iframe = document.getElementById('preview-frame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow && this.currentTemplate) {
      iframe.contentWindow.postMessage({
        type: 'UPDATE_TEMPLATE',
        payload: { ...this.currentTemplate }
      }, '*');
    }
  }

  setupEventListeners() {
    document.getElementById('template-name')?.addEventListener('input', (e) => {
      if (this.currentTemplate) {
        this.currentTemplate.name = (e.target as HTMLInputElement).value;
      }
    });

    document.getElementById('add-text')?.addEventListener('click', () => this.addNewElement('text'));
    document.getElementById('add-box')?.addEventListener('click', () => this.addNewElement('box'));
    document.getElementById('add-multimedia')?.addEventListener('click', () => this.addNewElement('multimedia'));
    document.getElementById('add-group')?.addEventListener('click', () => this.addNewElement('group'));

    document.getElementById('delete-element')?.addEventListener('click', () => {
      if (!this.currentTemplate || !this.selectedElementId) return;
      this.currentTemplate.elements = this.currentTemplate.elements.filter(e => e.id !== this.selectedElementId);
      this.selectedElementId = null;
      this.renderElementsList();
      this.selectElement(null);
      this.updatePreview();
    });
    
    document.getElementById('save-btn')?.addEventListener('click', async () => {
       if (this.currentTemplate) {
         try {
           await dbManager.saveTemplate({
             id: this.currentTemplate.id,
             name: this.currentTemplate.name,
             data: this.currentTemplate,
             updatedAt: Date.now()
           });
           alert('Template saved to safe storage!');
         } catch (err) {
           console.error('Failed to save:', err);
         }
       }
    });
  }

  addNewElement(type: string) {
    if (!this.currentTemplate) return;
    
    const id = 'e' + Math.random().toString(36).substr(2, 9);
    let newEl: any = {
      id,
      type,
      name: `New ${type}`,
      x: 100,
      y: 100,
      width: type === 'group' ? 200 : 150,
      height: type === 'group' ? 200 : 100,
      rotation: 0,
      opacity: 1,
      zIndex: this.currentTemplate.elements.length + 1,
      visible: true,
      position: 'absolute'
    };

    if (type === 'text') {
      Object.assign(newEl, {
        content: 'New Text',
        fontSize: 24,
        fontFamily: 'Inter',
        color: '#ffffff',
        textAlign: 'left'
      });
    } else if (type === 'multimedia') {
      Object.assign(newEl, {
        url: 'media:sample.mp4',
        loop: true,
        autoPlay: true
      });
    } else if (type === 'box') {
      Object.assign(newEl, {
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#6366f1'
      });
    } else if (type === 'group') {
      Object.assign(newEl, {
        elements: []
      });
    }

    this.currentTemplate.elements.push(newEl);
    this.renderElementsList();
    this.selectedElementId = id;
    this.selectElement(id);
    this.updatePreview();
  }
}

new Dashboard();
