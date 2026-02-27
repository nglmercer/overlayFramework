import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, ArrowLeft, Info, Settings, Image as ImageIcon, Type, Volume2, Trash2,
  ChevronDown, ChevronUp, Users, Gift, Coins, Layers, Radio, Heart, Activity, Target, Gamepad2, Monitor, Smartphone, GripVertical,
  Smile, AlignLeft, AlignCenter, AlignRight, AlignJustify, X, Music, Play
} from 'lucide-react';
import { dbManager, AlertVariant } from '../lib/db';
import { Input, Select, Toggle, ColorPicker, Range } from './FormControls';
import { MediaLibrary } from './MediaLibrary';

export default function Editor({ boxId, onBack }: { boxId: string, onBack: () => void }) {
  const [expandedSection, setExpandedSection] = useState<string | null>('seguimientos');
  const [rightExpandedSection, setRightExpandedSection] = useState<string | null>('general');
  const [randomize, setRandomize] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState<'image' | 'sound' | null>(null);
  
  const [variants, setVariants] = useState<AlertVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVariants();
  }, [boxId]);

  const loadVariants = async () => {
    const data = await dbManager.getVariants(boxId);
    setVariants(data);
    if (data.length > 0 && !selectedVariantId) {
      setSelectedVariantId(data[0].id);
    }
  };

  const handleCreateVariant = async () => {
    const type = expandedSection || 'seguimientos';
    
    let defaultCondition = 'Cualquier nuevo seguimiento a tu canal';
    let defaultName = 'Nueva variante';
    let defaultMessage = '¡{nombre de usuario} acaba de seguir!';
    
    if (type === 'suscripciones') {
      defaultCondition = 'La suscripción es de nivel';
      defaultName = 'Suscripción de Prime';
      defaultMessage = '¡{nombre de usuario} acaba de suscribirse con Prime!';
    } else if (type === 'suscripciones_regalo') {
      defaultCondition = 'Suscripciones de regalo de la comunidad';
      defaultName = 'Regalos de la comunidad';
      defaultMessage = '¡{nombre de usuario} le regaló {cantidad} suscripciones a la comunidad!';
    } else if (type === 'bits') {
      defaultCondition = 'Cheers mínimos';
      defaultName = 'Cheering de cualquier importe';
      defaultMessage = '¡{nombre de usuario} acaba de hacer Cheer con {cantidad} Bits!';
    }

    const newVariant: AlertVariant = {
      id: crypto.randomUUID(),
      boxId,
      type,
      name: defaultName,
      condition: defaultCondition,
      duration: 10,
      animationIn: 'none',
      animationOut: 'none',
      animationInDuration: 1,
      animationOutDuration: 1,
      layout: 'text-below',
      bgColor: '#FFFFFF00',
      bgOpacity: 0,
      padding: 16,
      spacing: 16,
      rounded: true,
      shadow: false,
      message: defaultMessage,
      fontFamily: 'Roboto',
      fontWeight: 'Seminegrita',
      fontSize: 24,
      textAlign: 'center',
      textColor: '#FFFFFF',
      highlightColor: '#9146FF',
      textShadow: false,
      ttsEnabled: false,
      imageScale: 50,
      imageVolume: 50,
      soundVolume: 50,
      active: true,
      level: type === 'suscripciones' ? 'Prime' : undefined,
      giftAmount: type === 'suscripciones_regalo' ? 1 : undefined,
      bitsFunction: type === 'bits' ? 'Cheering' : undefined,
      bitsAmount: type === 'bits' ? 1 : undefined,
    };
    await dbManager.saveVariant(newVariant);
    await loadVariants();
    setSelectedVariantId(newVariant.id);
  };

  const handleUpdateVariant = async (updates: Partial<AlertVariant>) => {
    if (!selectedVariantId) return;
    const variant = variants.find(v => v.id === selectedVariantId);
    if (!variant) return;
    
    const updated = { ...variant, ...updates };
    setVariants(vs => vs.map(v => v.id === selectedVariantId ? updated : v));
    await dbManager.saveVariant(updated);
  };

  const handleDeleteVariant = async () => {
    if (!selectedVariantId) return;
    await dbManager.deleteVariant(selectedVariantId);
    const data = await dbManager.getVariants(boxId);
    setVariants(data);
    setSelectedVariantId(data.length > 0 ? data[0].id : null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'sound') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'image') {
        handleUpdateVariant({ imageUrl: url, imageName: file.name });
      } else {
        handleUpdateVariant({ soundUrl: url, soundName: file.name });
      }
    }
  };

  const selectedVariant = variants.find(v => v.id === selectedVariantId);

  const sidebarItems = [
    { id: 'seguimientos', icon: Heart, label: 'Seguimientos' },
    { id: 'suscripciones', icon: Users, label: 'Suscripciones' },
    { id: 'suscripciones_regalo', icon: Gift, label: 'Suscripciones de regalo' },
    { id: 'bits', icon: Coins, label: 'Bits' },
    { id: 'combos', icon: Layers, label: 'Combos' },
    { id: 'raids', icon: Radio, label: 'Raids' },
    { id: 'beneficencia', icon: Activity, label: 'Beneficencia' },
    { id: 'trenes_hype', icon: Target, label: 'Trenes del Hype' },
    { id: 'puntos_canal', icon: Coins, label: 'Puntos de canal', badge: 'NUEVO', badgeColor: 'bg-pink-600' },
    { id: 'metas', icon: Target, label: 'Metas' },
    { id: 'crowd_control', icon: Gamepad2, label: 'Crowd Control', badge: 'SIN CONEXIÓN', badgeColor: 'bg-gray-600' },
    { id: 'streamelements', icon: Monitor, label: 'StreamElements', badge: 'SIN CONEXIÓN', badgeColor: 'bg-gray-600' },
    { id: 'streamlabs', icon: Monitor, label: 'Streamlabs', badge: 'SIN CONEXIÓN', badgeColor: 'bg-gray-600' },
    { id: 'throne', icon: Smartphone, label: 'Throne', badge: 'SIN CONEXIÓN', badgeColor: 'bg-gray-600' },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#0e0e10] text-white font-sans overflow-hidden">
      {/* Topbar */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 shrink-0 bg-[#18181b]">
        <button onClick={onBack} className="flex items-center space-x-2 text-sm font-semibold bg-[#3a3a3d] hover:bg-[#464649] px-3 py-1.5 rounded-full transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Regresar a la página de inicio de Alertas</span>
        </button>
        
        <div className="flex items-center space-x-2">
          <span className="font-bold">Alerts Box 2</span>
          <span className="text-gray-400 text-sm font-medium">16/200 variantes</span>
          <Info className="w-4 h-4 text-gray-400" />
        </div>

        <div className="flex items-center space-x-3">
          <button className="text-gray-400 text-sm font-semibold hover:text-white transition-colors" disabled>Deshacer cambios</button>
          <button className="bg-[#3a3a3d] text-gray-400 text-sm font-semibold px-4 py-1.5 rounded-full cursor-not-allowed">Guardar cambios</button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 border-r border-white/10 flex flex-col bg-[#18181b] overflow-y-auto custom-scrollbar">
          <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0">
            <span className="text-xs font-bold text-gray-400 tracking-wider">VARIANTES</span>
            <div className="flex items-center space-x-3">
              <button className="text-[#a970ff] text-sm font-semibold hover:text-[#bf94ff] transition-colors">Editar varios</button>
              <button className="p-1 hover:bg-white/10 rounded transition-colors"><Plus className="w-5 h-5" /></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {sidebarItems.map(item => (
              <div key={item.id} className="border-b border-white/5">
                <button 
                  onClick={() => setExpandedSection(expandedSection === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5 text-gray-300" />
                    <span className="font-semibold text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.badgeColor} text-white tracking-wide`}>
                        {item.badge}
                      </span>
                    )}
                    {expandedSection === item.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                
                {expandedSection === item.id && (
                  <div className="bg-[#0e0e10] p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Toggle */}
                        <div 
                          onClick={() => setRandomize(!randomize)}
                          className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors flex items-center ${randomize ? 'bg-[#9146FF]' : 'bg-gray-600'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform flex items-center justify-center ${randomize ? 'translate-x-5' : 'translate-x-0'}`}>
                             {randomize && <svg className="w-2.5 h-2.5 text-[#9146FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        </div>
                        <span className="text-sm font-medium">Elegir aleatoriamente</span>
                      </div>
                      <span className="text-xs text-[#a970ff] hover:underline cursor-pointer font-medium">Más información</span>
                    </div>
                    
                    <button onClick={handleCreateVariant} className="flex items-center space-x-2 text-sm font-semibold hover:text-gray-300 transition-colors">
                      <Plus className="w-4 h-4" />
                      <span>Nueva variante</span>
                    </button>
                    
                    {/* Variants List */}
                    <div className="space-y-2">
                      {variants.filter(v => v.type === item.id).map((variant, index) => (
                        <div 
                          key={variant.id}
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={`rounded-md p-2.5 flex items-center space-x-3 cursor-pointer transition-colors ${variant.id === selectedVariantId ? 'bg-[#9146FF] shadow-lg' : 'hover:bg-white/5'}`}
                        >
                          <GripVertical className={`w-4 h-4 transition-colors cursor-grab ${variant.id === selectedVariantId ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-300'}`} />
                          <div className={`w-6 h-6 rounded border flex items-center justify-center text-xs font-bold shrink-0 ${variant.id === selectedVariantId ? 'border-white/30 bg-white/10' : 'border-white/10 bg-transparent'}`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{variant.name}</div>
                            <div className={`text-xs truncate font-medium mt-0.5 ${variant.id === selectedVariantId ? 'text-white/80' : 'text-gray-400'}`}>
                              {variant.condition}
                            </div>
                          </div>
                          {/* Toggle Active */}
                          <div 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleUpdateVariant({ active: !variant.active });
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors flex items-center ${variant.active ? (variant.id === selectedVariantId ? 'bg-white' : 'bg-[#9146FF]') : (variant.id === selectedVariantId ? 'bg-white/30' : 'bg-gray-600')}`}
                          >
                            <div className={`w-4 h-4 rounded-full shadow-md transform transition-transform flex items-center justify-center ${variant.active ? `translate-x-5 ${variant.id === selectedVariantId ? 'bg-[#9146FF]' : 'bg-white'}` : `translate-x-0 bg-white`}`}>
                              {variant.active && <svg className={`w-2.5 h-2.5 ${variant.id === selectedVariantId ? 'text-white' : 'text-[#9146FF]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 flex flex-col bg-[#0e0e10] relative">
          {/* Tabs */}
          <div className="flex p-4 space-x-2 absolute top-0 left-0 z-10 w-full">
            <button className="bg-[#3a3a3d] text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md">Vista previa de alerta</button>
            <button className="hover:bg-white/10 text-gray-300 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors">Enviar alerta de prueba</button>
          </div>
          
          {/* Canvas Container */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden pt-16">
            {/* Checkerboard Background */}
            <div 
              className="relative w-full max-w-3xl aspect-video rounded-lg overflow-hidden flex items-center justify-center"
              style={{
                backgroundImage: 'linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px'
              }}
            >
                <div 
                  className={`text-center flex ${
                    selectedVariant?.layout === 'text-right' ? 'flex-row items-center space-x-6' : 
                    selectedVariant?.layout === 'text-over' ? 'relative items-center justify-center' : 
                    'flex-col items-center'
                  } ${selectedVariant?.rounded ? 'rounded-2xl' : ''} ${selectedVariant?.shadow ? 'shadow-2xl' : ''}`}
                  style={{
                    backgroundColor: selectedVariant?.bgColor ? `${selectedVariant.bgColor}${Math.round((selectedVariant.bgOpacity || 0) * 2.55).toString(16).padStart(2, '0')}` : 'transparent',
                    padding: `${selectedVariant?.padding || 0}px`,
                    gap: selectedVariant?.layout === 'text-over' ? 0 : `${selectedVariant?.spacing || 0}px`
                  }}
                >
                  {/* Media Graphic */}
                  <div 
                    className={`relative w-64 h-64 flex items-center justify-center ${selectedVariant?.layout === 'text-over' ? 'absolute inset-0 w-full h-full z-0 opacity-50' : ''}`}
                  >
                    {selectedVariant?.imageUrl ? (
                      <img 
                        src={selectedVariant.imageUrl} 
                        alt="Alert Media" 
                        className="max-w-full max-h-full object-contain drop-shadow-2xl"
                        style={{ transform: `scale(${selectedVariant.imageScale / 50})` }}
                      />
                    ) : (
                      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                        {/* Pink burst lines */}
                        <g stroke="#ff00ff" strokeWidth="4" strokeLinecap="round">
                          <line x1="100" y1="10" x2="100" y2="30" />
                          <line x1="150" y1="30" x2="135" y2="45" />
                          <line x1="180" y1="70" x2="160" y2="80" />
                          <line x1="190" y1="120" x2="170" y2="115" />
                          <line x1="160" y1="170" x2="145" y2="155" />
                          <line x1="110" y1="190" x2="105" y2="170" />
                          <line x1="60" y1="180" x2="70" y2="160" />
                          <line x1="20" y1="140" x2="40" y2="130" />
                          <line x1="10" y1="90" x2="30" y2="95" />
                          <line x1="30" y1="40" x2="45" y2="55" />
                          <line x1="70" y1="20" x2="80" y2="40" />
                        </g>
                        {/* Main white heart with black outline */}
                        <path d="M100 170C100 170 20 110 20 55C20 25 45 10 70 10C85 10 95 20 100 30C105 20 115 10 130 10C155 10 180 25 180 55C180 110 100 170 100 170Z" fill="white" stroke="#18181b" strokeWidth="12" strokeLinejoin="round" />
                        {/* Inner black heart detail */}
                        <path d="M100 140C100 140 40 90 40 50C40 30 55 20 70 20C80 20 90 30 100 40C110 30 120 20 130 20C145 20 160 30 160 50C160 90 100 140 100 140Z" fill="none" stroke="#18181b" strokeWidth="8" strokeLinejoin="round" />
                        {/* Yellow accent line */}
                        <path d="M70 10C85 10 95 20 100 30C105 20 115 10 130 10" fill="none" stroke="#ffff00" strokeWidth="6" strokeLinecap="round" />
                        <path d="M100 170C100 170 180 110 180 55" fill="none" stroke="#ffff00" strokeWidth="6" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <h2 
                    className={`text-3xl font-extrabold drop-shadow-lg tracking-tight ${selectedVariant?.layout === 'text-over' ? 'relative z-10' : ''}`}
                    style={{ 
                      color: selectedVariant?.textColor || '#FFFFFF',
                      fontFamily: selectedVariant?.fontFamily || 'Roboto',
                      textAlign: (selectedVariant?.textAlign as any) || 'center',
                      textShadow: selectedVariant?.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none'
                    }}
                  >
                    {selectedVariant?.message ? (
                      selectedVariant.message.split(/(\{.*?\})/).map((part, i) => {
                        if (part.startsWith('{') && part.endsWith('}')) {
                          let value = 'Usuario';
                          if (part === '{cantidad}') {
                            value = selectedVariant.type === 'bits' ? String(selectedVariant.bitsAmount || 1) : String(selectedVariant.giftAmount || 1);
                          }
                          return <span key={i} style={{ color: selectedVariant.highlightColor || '#9146FF' }}>{value}</span>;
                        }
                        return part;
                      })
                    ) : (
                      <>¡<span style={{ color: selectedVariant?.highlightColor || '#9146FF' }}>FlavioliRavioli</span> acaba de seguir!</>
                    )}
                  </h2>
                </div>
            </div>
          </div>

          {/* Preview Options Bar */}
          <div className="h-14 bg-[#18181b] border border-white/10 flex items-center justify-between px-4 shrink-0 mx-4 mb-4 rounded-lg shadow-lg">
            <span className="text-sm font-semibold">Opciones de vista previa</span>
            <div className="flex items-center space-x-5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-gray-400">Ancho px</span>
                <input type="text" value="800" className="bg-[#0e0e10] border border-white/10 rounded px-2 py-1 w-16 text-sm font-medium text-center focus:outline-none focus:border-[#a970ff] transition-colors" readOnly />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-gray-400">Altura px</span>
                <input type="text" value="600" className="bg-[#0e0e10] border border-white/10 rounded px-2 py-1 w-16 text-sm font-medium text-center focus:outline-none focus:border-[#a970ff] transition-colors" readOnly />
              </div>
              <Info className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white transition-colors" />
              <div className="flex items-center space-x-2 border-l border-white/10 pl-5">
                <button className="w-5 h-5 rounded bg-white border border-gray-400 hover:scale-110 transition-transform"></button>
                <button className="w-5 h-5 rounded bg-black border border-gray-600 hover:scale-110 transition-transform"></button>
                <button className="w-5 h-5 rounded bg-gray-500 border border-gray-600 hover:scale-110 transition-transform"></button>
                <button className="w-5 h-5 rounded bg-red-500 border border-gray-600 hover:scale-110 transition-transform"></button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar (Settings) */}
        <div className="w-80 border-l border-white/10 bg-[#18181b] flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex flex-col">
            {/* Configuración general */}
            <div className="border-b border-white/5">
              <button 
                onClick={() => setRightExpandedSection(rightExpandedSection === 'general' ? null : 'general')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-gray-300" />
                  <span className="font-semibold text-sm">Configuración general</span>
                </div>
                {rightExpandedSection === 'general' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {rightExpandedSection === 'general' && selectedVariant && (
                <div className="p-4 pt-0 space-y-4">
                  <Input 
                    label="Nombre de variante" 
                    value={selectedVariant.name} 
                    onChange={(e) => handleUpdateVariant({ name: e.target.value })} 
                  />
                  
                  {selectedVariant.type === 'bits' && (
                    <Select 
                      label="Función con Bits" 
                      value={selectedVariant.bitsFunction || 'Cheering'}
                      onChange={(e) => handleUpdateVariant({ bitsFunction: e.target.value })}
                      options={[
                        { value: 'Cheering', label: 'Cheering' },
                        { value: 'Extensiones', label: 'Extensiones' },
                      ]}
                    />
                  )}

                  <Select 
                    label="Condición de alerta" 
                    value={selectedVariant.condition}
                    onChange={(e) => handleUpdateVariant({ condition: e.target.value })}
                    options={
                      selectedVariant.type === 'seguimientos' ? [
                        { value: 'Cualquier nuevo seguimiento a tu canal', label: 'Cualquier nuevo seguimiento a tu canal' },
                      ] : selectedVariant.type === 'suscripciones' ? [
                        { value: 'La suscripción es de nivel', label: 'La suscripción es de nivel' },
                        { value: 'Resuscripción', label: 'Resuscripción' },
                        { value: 'Nuevo suscriptor', label: 'Nuevo suscriptor' },
                      ] : selectedVariant.type === 'suscripciones_regalo' ? [
                        { value: 'Suscripciones de regalo de la comunidad', label: 'Suscripciones de regalo de la comunidad' },
                        { value: 'Suscripción de regalo', label: 'Suscripción de regalo' },
                      ] : selectedVariant.type === 'bits' ? [
                        { value: 'Cheers mínimos', label: 'Cheers mínimos' },
                        { value: 'Cheers exactos', label: 'Cheers exactos' },
                      ] : []
                    }
                  />

                  {selectedVariant.type === 'suscripciones' && selectedVariant.condition === 'La suscripción es de nivel' && (
                    <Select 
                      label="Nivel" 
                      value={selectedVariant.level || 'Prime'}
                      onChange={(e) => handleUpdateVariant({ level: e.target.value })}
                      options={[
                        { value: 'Prime', label: 'Prime' },
                        { value: 'Nivel 1', label: 'Nivel 1' },
                        { value: 'Nivel 2', label: 'Nivel 2' },
                        { value: 'Nivel 3', label: 'Nivel 3' },
                      ]}
                    />
                  )}

                  {selectedVariant.type === 'suscripciones_regalo' && (
                    <Input 
                      label="Suscripciones de regalo" 
                      type="number" 
                      value={selectedVariant.giftAmount || 1} 
                      onChange={(e) => handleUpdateVariant({ giftAmount: Number(e.target.value) })} 
                    />
                  )}

                  {selectedVariant.type === 'bits' && (
                    <Input 
                      label="Bits" 
                      type="number" 
                      value={selectedVariant.bitsAmount || 1} 
                      onChange={(e) => handleUpdateVariant({ bitsAmount: Number(e.target.value) })} 
                    />
                  )}

                  <button className="w-full bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold py-2 rounded transition-colors flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                    <span>Crear alerta aleatoria duplicada</span>
                  </button>
                  <Input 
                    label="Duración (En segundos, 99 máx.)" 
                    type="number" 
                    value={selectedVariant.duration} 
                    onChange={(e) => handleUpdateVariant({ duration: Number(e.target.value) })} 
                  />
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-2">Animaciones (En segundos)</label>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs text-gray-400 w-12">Entrada</span>
                      <select 
                        className="flex-1 bg-[#0e0e10] border border-white/10 rounded p-1.5 text-sm focus:outline-none focus:border-[#a970ff] transition-colors appearance-none"
                        value={selectedVariant.animationIn}
                        onChange={(e) => handleUpdateVariant({ animationIn: e.target.value })}
                      >
                        <option value="none">Sin animación</option>
                        <option value="fade-in">Aparición gradual</option>
                      </select>
                      <input 
                        type="number" 
                        value={selectedVariant.animationInDuration} 
                        onChange={(e) => handleUpdateVariant({ animationInDuration: Number(e.target.value) })}
                        className="w-12 bg-[#0e0e10] border border-white/10 rounded p-1.5 text-sm text-center focus:outline-none focus:border-[#a970ff] transition-colors" 
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400 w-12">Salida</span>
                      <select 
                        className="flex-1 bg-[#0e0e10] border border-white/10 rounded p-1.5 text-sm focus:outline-none focus:border-[#a970ff] transition-colors appearance-none"
                        value={selectedVariant.animationOut}
                        onChange={(e) => handleUpdateVariant({ animationOut: e.target.value })}
                      >
                        <option value="none">Sin animación</option>
                        <option value="fade-out">Desaparición gradual</option>
                      </select>
                      <input 
                        type="number" 
                        value={selectedVariant.animationOutDuration} 
                        onChange={(e) => handleUpdateVariant({ animationOutDuration: Number(e.target.value) })}
                        className="w-12 bg-[#0e0e10] border border-white/10 rounded p-1.5 text-sm text-center focus:outline-none focus:border-[#a970ff] transition-colors" 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Diseño */}
            <div className="border-b border-white/5">
              <button 
                onClick={() => setRightExpandedSection(rightExpandedSection === 'design' ? null : 'design')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <ImageIcon className="w-5 h-5 text-gray-300" />
                  <span className="font-semibold text-sm">Diseño</span>
                </div>
                {rightExpandedSection === 'design' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {rightExpandedSection === 'design' && selectedVariant && (
                <div className="p-4 pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleUpdateVariant({ layout: 'text-below' })}
                      className={`h-16 bg-[#0e0e10] border rounded flex flex-col items-center justify-center space-y-2 transition-colors ${selectedVariant.layout === 'text-below' ? 'border-[#a970ff] border-2' : 'border-white/10 hover:border-white/30'}`}
                    >
                      <div className="w-8 h-4 bg-gray-500 rounded-sm"></div>
                      <div className="w-10 h-1 bg-gray-400 rounded-full"></div>
                    </button>
                    <button 
                      onClick={() => handleUpdateVariant({ layout: 'text-right' })}
                      className={`h-16 bg-[#0e0e10] border rounded flex items-center justify-center space-x-3 transition-colors ${selectedVariant.layout === 'text-right' ? 'border-[#a970ff] border-2' : 'border-white/10 hover:border-white/30'}`}
                    >
                      <div className="w-8 h-1 bg-gray-400 rounded-full"></div>
                      <div className="w-8 h-6 bg-gray-500 rounded-sm"></div>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => handleUpdateVariant({ layout: 'text-over' })}
                      className={`h-16 bg-[#0e0e10] border rounded flex items-center justify-center relative transition-colors ${selectedVariant.layout === 'text-over' ? 'border-[#a970ff] border-2' : 'border-white/10 hover:border-white/30'}`}
                    >
                      <div className="w-10 h-8 bg-gray-500 rounded-sm absolute"></div>
                      <div className="w-6 h-1.5 bg-white rounded-full absolute z-10"></div>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <ColorPicker 
                      label="Fondo" 
                      value={selectedVariant.bgColor} 
                      onChange={(val) => handleUpdateVariant({ bgColor: val })} 
                    />
                    <Input 
                      label="Opacidad (porcentaje)" 
                      type="number" 
                      value={selectedVariant.bgOpacity} 
                      onChange={(e) => handleUpdateVariant({ bgOpacity: Number(e.target.value) })} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Relleno (px)" 
                      type="number" 
                      value={selectedVariant.padding} 
                      onChange={(e) => handleUpdateVariant({ padding: Number(e.target.value) })} 
                    />
                    <Input 
                      label="Espacio (px)" 
                      type="number" 
                      value={selectedVariant.spacing} 
                      onChange={(e) => handleUpdateVariant({ spacing: Number(e.target.value) })} 
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <Toggle 
                      label="Esquinas redondeadas" 
                      checked={selectedVariant.rounded} 
                      onChange={(val) => handleUpdateVariant({ rounded: val })} 
                    />
                    <Toggle 
                      label="Sombrear" 
                      checked={selectedVariant.shadow} 
                      onChange={(val) => handleUpdateVariant({ shadow: val })} 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Texto y voz */}
            <div className="border-b border-white/5">
              <button 
                onClick={() => setRightExpandedSection(rightExpandedSection === 'text' ? null : 'text')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Type className="w-5 h-5 text-gray-300" />
                  <span className="font-semibold text-sm">Texto y voz</span>
                </div>
                {rightExpandedSection === 'text' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {rightExpandedSection === 'text' && selectedVariant && (
                <div className="p-4 pt-0 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Mensaje</label>
                    <div className="relative">
                      <textarea 
                        className="w-full bg-[#0e0e10] border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-[#a970ff] transition-colors resize-none h-20"
                        value={selectedVariant.message}
                        onChange={(e) => handleUpdateVariant({ message: e.target.value })}
                      ></textarea>
                      <button className="absolute bottom-2 right-2 text-gray-400 hover:text-white"><Smile className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Fuente</label>
                    <div className="space-y-2">
                      <Select 
                        value={selectedVariant.fontFamily}
                        onChange={(e) => handleUpdateVariant({ fontFamily: e.target.value })}
                        options={[
                          { value: 'Roboto', label: 'Roboto' },
                          { value: 'Inter', label: 'Inter' },
                          { value: 'Arial', label: 'Arial' },
                        ]}
                      />
                      <div className="flex space-x-2">
                        <Select 
                          className="flex-1"
                          value={selectedVariant.fontWeight}
                          onChange={(e) => handleUpdateVariant({ fontWeight: e.target.value })}
                          options={[
                            { value: 'Normal', label: 'Normal' },
                            { value: 'Seminegrita', label: 'Seminegrita' },
                            { value: 'Negrita', label: 'Negrita' },
                          ]}
                        />
                        <Select 
                          className="flex-1"
                          value={selectedVariant.fontSize.toString()}
                          onChange={(e) => handleUpdateVariant({ fontSize: Number(e.target.value) })}
                          options={[
                            { value: '16', label: '16 px' },
                            { value: '24', label: '24 px' },
                            { value: '32', label: '32 px' },
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Alineación del texto</label>
                    <div className="flex space-x-1">
                      <button onClick={() => handleUpdateVariant({ textAlign: 'left' })} className={`p-2 rounded transition-colors ${selectedVariant.textAlign === 'left' ? 'bg-[#3a3a3d]' : 'bg-[#0e0e10] border border-white/10 hover:bg-white/5'}`}><AlignLeft className="w-4 h-4" /></button>
                      <button onClick={() => handleUpdateVariant({ textAlign: 'center' })} className={`p-2 rounded transition-colors ${selectedVariant.textAlign === 'center' ? 'bg-[#3a3a3d]' : 'bg-[#0e0e10] border border-white/10 hover:bg-white/5'}`}><AlignCenter className="w-4 h-4" /></button>
                      <button onClick={() => handleUpdateVariant({ textAlign: 'right' })} className={`p-2 rounded transition-colors ${selectedVariant.textAlign === 'right' ? 'bg-[#3a3a3d]' : 'bg-[#0e0e10] border border-white/10 hover:bg-white/5'}`}><AlignRight className="w-4 h-4" /></button>
                      <button onClick={() => handleUpdateVariant({ textAlign: 'justify' })} className={`p-2 rounded transition-colors ${selectedVariant.textAlign === 'justify' ? 'bg-[#3a3a3d]' : 'bg-[#0e0e10] border border-white/10 hover:bg-white/5'}`}><AlignJustify className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <ColorPicker 
                      label="Color de texto" 
                      value={selectedVariant.textColor} 
                      onChange={(val) => handleUpdateVariant({ textColor: val })} 
                    />
                    <ColorPicker 
                      label="Color del resaltado" 
                      value={selectedVariant.highlightColor} 
                      onChange={(val) => handleUpdateVariant({ highlightColor: val })} 
                    />
                  </div>

                  <div className="pt-2">
                    <Toggle 
                      label="Sombrear" 
                      checked={selectedVariant.textShadow} 
                      onChange={(val) => handleUpdateVariant({ textShadow: val })} 
                    />
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <span className="text-xs font-bold text-gray-400 tracking-wider mb-3 block">TEXTO A VOZ</span>
                    <Toggle 
                      label="Leer el texto de la alerta" 
                      checked={selectedVariant.ttsEnabled} 
                      onChange={(val) => handleUpdateVariant({ ttsEnabled: val })} 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Imágenes y sonido */}
            <div className="border-b border-white/5">
              <button 
                onClick={() => setRightExpandedSection(rightExpandedSection === 'media' ? null : 'media')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-5 h-5 text-gray-300" />
                  <span className="font-semibold text-sm">Imágenes y sonido</span>
                </div>
                {rightExpandedSection === 'media' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {rightExpandedSection === 'media' && selectedVariant && (
                <div className="p-4 pt-0 space-y-6">
                  {/* Imagen de alerta */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-bold text-gray-400 tracking-wider">IMAGEN DE ALERTA</span>
                      <Info className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="border border-dashed border-white/20 rounded-lg p-4 mb-3 relative bg-[#0e0e10] flex flex-col items-center justify-center h-32 overflow-hidden">
                      {selectedVariant.imageUrl ? (
                        <>
                          <span className="absolute top-2 left-2 text-xs font-medium text-gray-400 z-10 bg-black/50 px-1 rounded">{selectedVariant.imageName}</span>
                          <button 
                            onClick={() => handleUpdateVariant({ imageUrl: '', imageName: '' })}
                            className="absolute top-2 right-2 text-gray-400 hover:text-white z-10 bg-black/50 rounded-full p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <img src={selectedVariant.imageUrl} alt="Alert" className="w-full h-full object-contain" />
                        </>
                      ) : (
                        <>
                          <span className="absolute top-2 left-2 text-xs font-medium text-gray-400">Sin imagen</span>
                          <Heart className="w-12 h-12 text-white/20" />
                        </>
                      )}
                    </div>
                    <div className="space-y-2 mb-4">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'image')}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold py-2 rounded transition-colors"
                      >
                        Cargar archivo
                      </button>
                      <button 
                        onClick={() => setShowMediaLibrary('image')}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold py-2 rounded transition-colors"
                      >
                        Biblioteca de imágenes
                      </button>
                    </div>
                    <div className="space-y-3">
                      <Range 
                        label="Escala" 
                        value={selectedVariant.imageScale} 
                        onChange={(val) => handleUpdateVariant({ imageScale: val })} 
                      />
                      <Range 
                        label="Volumen" 
                        value={selectedVariant.imageVolume} 
                        onChange={(val) => handleUpdateVariant({ imageVolume: val })} 
                      />
                    </div>
                  </div>

                  {/* Sonido de alerta */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-bold text-gray-400 tracking-wider">SONIDO DE ALERTA</span>
                      <Info className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="border border-dashed border-white/20 rounded-lg p-4 mb-3 relative bg-[#0e0e10] flex flex-col items-center justify-center h-32">
                      {selectedVariant.soundUrl ? (
                        <>
                          <span className="absolute top-2 left-2 text-xs font-medium text-gray-400">{selectedVariant.soundName}</span>
                          <button 
                            onClick={() => handleUpdateVariant({ soundUrl: '', soundName: '' })}
                            className="absolute top-2 right-2 text-gray-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="w-10 h-10 rounded-full bg-[#9146FF] flex items-center justify-center">
                            <Music className="w-5 h-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="absolute top-2 left-2 text-xs font-medium text-gray-400">Sin sonido</span>
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            <Music className="w-5 h-5 text-white/50" />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="space-y-2 mb-4">
                      <input 
                        type="file" 
                        id="sound-upload"
                        className="hidden" 
                        accept="audio/*"
                        onChange={(e) => handleFileUpload(e, 'sound')}
                      />
                      <button 
                        onClick={() => document.getElementById('sound-upload')?.click()}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold py-2 rounded transition-colors"
                      >
                        Cargar archivo
                      </button>
                      <button 
                        onClick={() => setShowMediaLibrary('sound')}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold py-2 rounded transition-colors"
                      >
                        Biblioteca de sonidos
                      </button>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button className="text-white hover:text-gray-300"><Play className="w-4 h-4 fill-current" /></button>
                      <Range 
                        label="Volumen" 
                        value={selectedVariant.soundVolume} 
                        onChange={(val) => handleUpdateVariant({ soundVolume: val })} 
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Eliminar variante */}
            <div className="border-b border-white/5">
              <button 
                onClick={() => setRightExpandedSection(rightExpandedSection === 'delete' ? null : 'delete')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <Trash2 className="w-5 h-5 text-gray-300 group-hover:text-red-400 transition-colors" />
                  <span className="font-semibold text-sm group-hover:text-red-400 transition-colors">Eliminar variante</span>
                </div>
                {rightExpandedSection === 'delete' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {rightExpandedSection === 'delete' && selectedVariant && (
                <div className="p-4 pt-0">
                  <p className="text-xs text-gray-300 font-semibold mb-3">No se pueden deshacer estas acciones</p>
                  <button 
                    onClick={handleDeleteVariant}
                    className="w-full bg-[#ff4f4d] hover:bg-[#ff6b69] text-white text-sm font-bold py-2 rounded transition-colors"
                  >
                    Eliminar variante
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="h-14 border-t border-white/10 bg-[#18181b] flex items-center justify-between px-4 shrink-0">
        <div className="text-xs font-semibold text-gray-400 flex items-center space-x-1">
          <span>Las variantes se enumeran en orden de prioridad</span>
          <span className="text-[#a970ff] hover:text-[#bf94ff] hover:underline cursor-pointer transition-colors">Más información</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs font-bold">URL de fuente del navegador</span>
          <div className="flex items-center">
            <input 
              type="password" 
              value="https://example.com/alert/12345" 
              className="bg-[#0e0e10] border border-white/10 rounded-l-md px-3 py-1.5 text-sm w-64 focus:outline-none font-mono text-gray-300" 
              readOnly 
            />
            <button className="bg-[#9146FF] hover:bg-[#772ce8] text-white px-5 py-1.5 rounded-r-md text-sm font-semibold transition-colors border border-[#9146FF] hover:border-[#772ce8]">
              Copiar
            </button>
          </div>
        </div>
      </div>
      {showMediaLibrary && (
        <MediaLibrary 
          type={showMediaLibrary} 
          onClose={() => setShowMediaLibrary(null)} 
          onSelect={(url, name) => {
            if (showMediaLibrary === 'image') {
              handleUpdateVariant({ imageUrl: url, imageName: name });
            } else {
              handleUpdateVariant({ soundUrl: url, soundName: name });
            }
            setShowMediaLibrary(null);
          }}
        />
      )}
    </div>
  );
}
