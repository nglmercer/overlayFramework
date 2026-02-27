import { useState, useMemo } from 'react';
import { X, Music, Play, Info } from 'lucide-react';

interface MediaLibraryProps {
  type: 'image' | 'sound';
  onClose: () => void;
  onSelect: (url: string, name: string) => void;
}

export function MediaLibrary({ type, onClose, onSelect }: MediaLibraryProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('date');
  const itemsPerPage = 6;

  const images = [
    { id: '1', name: 'RewardRedemption.webm', date: '2023-07-24', size: 1.29, url: 'https://picsum.photos/seed/1/200/200' },
    { id: '2', name: 'GoalStarted.webm', date: '2022-08-10', size: 1.48, url: 'https://picsum.photos/seed/2/200/200' },
    { id: '3', name: 'GoalCompleted.webm', date: '2022-08-10', size: 1.53, url: 'https://picsum.photos/seed/3/200/200' },
    { id: '4', name: 'HypeTrainStarted.webm', date: '2022-08-10', size: 1.55, url: 'https://picsum.photos/seed/4/200/200' },
    { id: '5', name: 'HypeTrainLevelAchieved.webm', date: '2022-08-10', size: 1.68, url: 'https://picsum.photos/seed/5/200/200' },
    { id: '6', name: 'HypeTrainAll-time-high.webm', date: '2022-08-10', size: 1.69, url: 'https://picsum.photos/seed/6/200/200' },
    { id: '7', name: 'Follow.webm', date: '2022-08-11', size: 2.10, url: 'https://picsum.photos/seed/7/200/200' },
    { id: '8', name: 'Subscribe.webm', date: '2022-08-12', size: 3.50, url: 'https://picsum.photos/seed/8/200/200' },
  ];

  const sounds = [
    { id: '1', name: 'victory.wav', date: '2022-08-09', size: 1.24 },
    { id: '2', name: 'tense.wav', date: '2022-08-09', size: 0.92 },
    { id: '3', name: 'riff.wav', date: '2022-08-09', size: 0.84 },
    { id: '4', name: 'levelUp.wav', date: '2022-08-09', size: 1.06 },
    { id: '5', name: 'glimmer.wav', date: '2022-08-09', size: 0.97 },
    { id: '6', name: 'chirp.wav', date: '2022-08-09', size: 0.83 },
    { id: '7', name: 'alert.wav', date: '2022-08-10', size: 0.50 },
    { id: '8', name: 'notification.wav', date: '2022-08-11', size: 0.30 },
  ];

  const allItems = type === 'image' ? images : sounds;

  const sortedItems = useMemo(() => {
    return [...allItems].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        return b.size - a.size;
      }
      return 0;
    });
  }, [allItems, sortBy]);

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const currentItems = sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#18181b] rounded-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="p-6 flex justify-between items-center border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Librería de recursos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white border-b-2 border-[#a970ff] pb-1">Almacenamiento</span>
              </div>
              <span className="text-sm text-gray-400">13.76 MB / 100 MB</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors">
                Cargar archivo
              </button>
              <Info className="w-5 h-5 text-gray-400" />
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-300">Ordenar por</span>
                <select 
                  className="bg-[#0e0e10] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a970ff]"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="date">Fecha de incorporación</option>
                  <option value="name">Nombre</option>
                  <option value="size">Tamaño</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {currentItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => setSelectedItem(item.id)}
                className={`bg-[#26262c] rounded-lg p-4 cursor-pointer transition-colors border-2 ${selectedItem === item.id ? 'border-[#a970ff]' : 'border-transparent hover:border-white/20'}`}
              >
                <div className="aspect-video bg-[#0e0e10] rounded-md mb-3 flex items-center justify-center overflow-hidden relative">
                  {type === 'image' && 'url' in item ? (
                    <img src={(item as any).url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Music className="w-8 h-8 text-white/50" />
                  )}
                  {type === 'sound' && (
                    <button className="absolute bottom-2 right-2 text-white hover:text-[#a970ff] transition-colors">
                      <Play className="w-6 h-6 fill-current" />
                    </button>
                  )}
                </div>
                <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                <div className="text-xs text-gray-400 mt-1">{formatDate(item.date)} - {item.size} MB</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex justify-between items-center">
          <div className="flex space-x-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-gray-400 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-md ${currentPage === i + 1 ? 'bg-[#9146FF] text-white' : 'hover:bg-white/10 text-gray-400'}`}
              >
                {i + 1}
              </button>
            ))}
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-gray-400 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              &gt;
            </button>
          </div>
          <div className="flex space-x-3">
            <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              Cancelar
            </button>
            <button 
              onClick={() => {
                const selected = allItems.find(i => i.id === selectedItem);
                if (selected) {
                  onSelect('url' in selected ? (selected as any).url : '', selected.name);
                }
              }}
              disabled={!selectedItem}
              className="bg-[#9146FF] hover:bg-[#a970ff] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
            >
              Añadir a alertas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
