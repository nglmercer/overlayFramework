import { useState, useEffect } from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import { dbManager, AlertBox } from '../lib/db';

export default function Dashboard({ onEdit }: { onEdit: (id: string) => void }) {
  const [alertBoxes, setAlertBoxes] = useState<AlertBox[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadBoxes();
  }, []);

  const loadBoxes = async () => {
    const boxes = await dbManager.getBoxes();
    if (boxes.length === 0) {
      const defaultBox = { id: '1', name: 'Alerts Box 1', enabled: true };
      await dbManager.saveBox(defaultBox);
      setAlertBoxes([defaultBox]);
    } else {
      setAlertBoxes(boxes);
    }
  };

  const handleCreateBox = async () => {
    if (alertBoxes.length >= 10) return;
    const newBox = {
      id: crypto.randomUUID(),
      name: `Alerts Box ${alertBoxes.length + 1}`,
      enabled: true
    };
    await dbManager.saveBox(newBox);
    await loadBoxes();
  };

  const handleToggleBox = async (box: AlertBox) => {
    const updated = { ...box, enabled: !box.enabled };
    await dbManager.saveBox(updated);
    await loadBoxes();
  };

  const handleDeleteBox = async (id: string) => {
    await dbManager.deleteBox(id);
    await loadBoxes();
    setOpenMenuId(null);
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Tus alertas</h1>
        <p className="text-gray-400 mb-6 font-medium">Grupos de alertas: {alertBoxes.length}/10</p>

        <button 
          onClick={handleCreateBox}
          disabled={alertBoxes.length >= 10}
          className="w-full bg-[#9146FF] hover:bg-[#772ce8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center mb-8 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Crear recuadro de alerta
        </button>

        <div className="space-y-4">
          {alertBoxes.map(box => (
            <div key={box.id} className="bg-[#18181b] rounded-lg p-5 flex flex-col relative border border-white/5">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  {/* Custom Toggle */}
                  <div 
                    onClick={() => handleToggleBox(box)}
                    className={`w-11 h-6 rounded-full p-0.5 cursor-pointer transition-colors flex items-center ${box.enabled ? 'bg-[#9146FF]' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform flex items-center justify-center ${box.enabled ? 'translate-x-5' : 'translate-x-0'}`}>
                      {box.enabled && <svg className="w-3 h-3 text-[#9146FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                  <span className="font-medium text-lg">{box.name}</span>
                </div>
                
                <button 
                  onClick={() => setOpenMenuId(openMenuId === box.id ? null : box.id)} 
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
                
                {/* Dropdown Menu */}
                {openMenuId === box.id && (
                  <div className="absolute top-14 right-5 w-56 bg-[#1f1f23] border border-white/10 rounded-md shadow-2xl z-10 py-1">
                    <button className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-sm font-medium transition-colors text-gray-200">Copiar fuente de navegador</button>
                    <button className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-sm font-medium transition-colors text-gray-200">Renombrar</button>
                    <button className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-sm font-medium transition-colors text-gray-200 border-b border-white/5">Duplicado</button>
                    <button 
                      onClick={() => handleDeleteBox(box.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-sm font-medium transition-colors text-red-400"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => onEdit(box.id)} 
                  className="bg-[#3a3a3d] hover:bg-[#464649] text-white font-semibold py-1.5 px-4 rounded-md transition-colors text-sm"
                >
                  Editar alertas
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
