import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Download, Upload, Plus, RefreshCw, Grid as GridIcon, Trash2, ChevronRight, ChevronDown, ChevronsUpDown, Settings, Eye, EyeOff, X, Wand2, PaintBucket, BarChart, Github } from 'lucide-react';
import GridCanvas, { GridCanvasHandle } from './components/GridCanvas';
import GradientEditor from './components/GradientEditor';
import ColorPicker from './components/ColorPicker';
import { GridConfig, PaletteItem, ColorStop, GradientType, SelectionBounds } from './types';
import { generateUUID, generateGradientSuggestions, GradientSuggestion } from './utils/colorUtils';
import { translations, Language, SUPPORTED_LANGUAGES } from './src/translations';

const DEFAULT_STOPS: ColorStop[] = [
  { id: '1', offset: 0, color: '#FF5733' },
  { id: '2', offset: 1, color: '#33C1FF' },
];

// --- Static Presets Data ---

type PresetDefinition = {
  type: 'solid' | 'gradient';
  name?: string;
  value: string | Array<{o: number, c: string}>; // Hex or Stops
};

type PresetCategory = {
  id: string;
  label: string;
  items: PresetDefinition[];
};

const STATIC_LIBRARIES: PresetCategory[] = [
  {
    id: 'basic_solids',
    label: 'Basic Solids',
    items: [
      '#ffffff', '#e5e5e5', '#a3a3a3', '#525252', '#171717', '#000000',
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
      '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
    ].map(c => ({ type: 'solid', value: c }))
  },
  {
    id: 'basics',
    label: 'Basics & Metals',
    items: [
      { name: 'p_black_white', stops: [{ o: 0, c: '#000000' }, { o: 1, c: '#ffffff' }] },
      { name: 'p_soft_gray', stops: [{ o: 0, c: '#cfd9df' }, { o: 1, c: '#e2ebf0' }] },
      { name: 'p_silver', stops: [{ o: 0, c: '#C0C0C0' }, { o: 0.5, c: '#E8E8E8' }, { o: 1, c: '#C0C0C0' }] },
      { name: 'p_gold_standard', stops: [{ o: 0, c: '#BF953F' }, { o: 0.5, c: '#FCF6BA' }, { o: 1, c: '#B38728' }] },
      { name: 'p_rose_gold', stops: [{ o: 0, c: '#E6C6C1' }, { o: 0.5, c: '#F4E3E1' }, { o: 1, c: '#D6A69F' }] },
      { name: 'p_bronze', stops: [{ o: 0, c: '#8E5A3C' }, { o: 0.5, c: '#B58261' }, { o: 1, c: '#8E5A3C' }] },
      { name: 'p_chrome', stops: [{ o: 0, c: '#29323c' }, { o: 1, c: '#485563' }] },
      { name: 'p_dark_metal', stops: [{ o: 0, c: '#232526' }, { o: 1, c: '#414345' }] },
    ].map(g => ({ type: 'gradient', name: g.name, value: g.stops }))
  },
  {
    id: 'warm',
    label: 'Warm & Sunset',
    items: [
      { name: 'p_sunset', stops: [{ o: 0, c: '#2c3e50' }, { o: 1, c: '#fd746c' }] },
      { name: 'p_dawn', stops: [{ o: 0, c: '#f83600' }, { o: 1, c: '#f9d423' }] },
      { name: 'p_heatwave', stops: [{ o: 0, c: '#F09819' }, { o: 1, c: '#EDDE5D' }] },
      { name: 'p_cherry', stops: [{ o: 0, c: '#EB3349' }, { o: 1, c: '#F45C43' }] },
      { name: 'p_burning_orange', stops: [{ o: 0, c: '#FF416C' }, { o: 1, c: '#FF4B2B' }] },
      { name: 'p_peach', stops: [{ o: 0, c: '#FFECD2' }, { o: 1, c: '#FCB69F' }] },
      { name: 'p_autumn', stops: [{ o: 0, c: '#DAD299' }, { o: 1, c: '#B0DAB9' }] },
      { name: 'p_red_mist', stops: [{ o: 0, c: '#000000' }, { o: 1, c: '#e74c3c' }] },
      { name: 'p_desert', stops: [{ o: 0, c: '#C02425' }, { o: 1, c: '#F0CB35' }] },
    ].map(g => ({ type: 'gradient', name: g.name, value: g.stops }))
  },
  {
    id: 'cool',
    label: 'Cool & Blues',
    items: [
      { name: 'p_ocean', stops: [{ o: 0, c: '#2E3192' }, { o: 1, c: '#1BFFFF' }] },
      { name: 'p_sky', stops: [{ o: 0, c: '#2980B9' }, { o: 0.5, c: '#6DD5FA' }, { o: 1, c: '#FFFFFF' }] },
      { name: 'p_cool_blues', stops: [{ o: 0, c: '#2193b0' }, { o: 1, c: '#6dd5fa' }] },
      { name: 'p_deep_sea', stops: [{ o: 0, c: '#2C3E50' }, { o: 1, c: '#4CA1AF' }] },
      { name: 'p_aqua', stops: [{ o: 0, c: '#13547a' }, { o: 1, c: '#80d0c7' }] },
      { name: 'p_night', stops: [{ o: 0, c: '#000428' }, { o: 1, c: '#004e92' }] },
      { name: 'p_ice', stops: [{ o: 0, c: '#74ebd5' }, { o: 1, c: '#ACB6E5' }] },
      { name: 'p_frozen', stops: [{ o: 0, c: '#C9D6FF' }, { o: 1, c: '#E2E2E2' }] },
    ].map(g => ({ type: 'gradient', name: g.name, value: g.stops }))
  },
  {
    id: 'nature',
    label: 'Nature & Earth',
    items: [
      { name: 'p_forest', stops: [{ o: 0, c: '#5A3F37' }, { o: 1, c: '#2C7744' }] },
      { name: 'p_lush', stops: [{ o: 0, c: '#11998e' }, { o: 1, c: '#38ef7d' }] },
      { name: 'p_grass', stops: [{ o: 0, c: '#DCE35B' }, { o: 1, c: '#45B649' }] },
      { name: 'p_earth', stops: [{ o: 0, c: '#200122' }, { o: 1, c: '#6f0000' }] },
      { name: 'p_sand', stops: [{ o: 0, c: '#3E5151' }, { o: 1, c: '#DECBA4' }] },
      { name: 'p_moss', stops: [{ o: 0, c: '#134E5E' }, { o: 1, c: '#71B280' }] },
      { name: 'p_leaf', stops: [{ o: 0, c: '#00b09b' }, { o: 1, c: '#96c93d' }] },
    ].map(g => ({ type: 'gradient', name: g.name, value: g.stops }))
  },
  {
    id: 'vibrant',
    label: 'Vibrant & Neon',
    items: [
      { name: 'p_neon', stops: [{ o: 0, c: '#f12711' }, { o: 1, c: '#f5af19' }] },
      { name: 'p_synthwave', stops: [{ o: 0, c: '#fc00ff' }, { o: 1, c: '#00dbde' }] },
      { name: 'p_cyberpunk', stops: [{ o: 0, c: '#2b5876' }, { o: 1, c: '#4e4376' }] },
      { name: 'p_rainbow', stops: [{ o: 0, c: '#ff0000' }, { o: 0.2, c: '#ffff00' }, { o: 0.4, c: '#00ff00' }, { o: 0.6, c: '#00ffff' }, { o: 0.8, c: '#0000ff' }, { o: 1, c: '#ff00ff' }] },
      { name: 'p_ultraviolet', stops: [{ o: 0, c: '#654ea3' }, { o: 1, c: '#eaafc8' }] },
      { name: 'p_disco', stops: [{ o: 0, c: '#4ECDC4' }, { o: 1, c: '#556270' }] },
      { name: 'p_plasma', stops: [{ o: 0, c: '#bc4e9c' }, { o: 1, c: '#f80759' }] },
      { name: 'p_electric_violet', stops: [{ o: 0, c: '#4776E6' }, { o: 1, c: '#8E54E9' }] },
    ].map(g => ({ type: 'gradient', name: g.name, value: g.stops }))
  },
  {
    id: 'pastel',
    label: 'Pastels',
    items: [
      { name: 'p_candy', stops: [{ o: 0, c: '#D9AFD9' }, { o: 1, c: '#97D9E1' }] },
      { name: 'p_cotton_candy', stops: [{ o: 0, c: '#F2994A' }, { o: 1, c: '#F2C94C' }] },
      { name: 'p_cloud', stops: [{ o: 0, c: '#ECE9E6' }, { o: 1, c: '#FFFFFF' }] },
      { name: 'p_blush', stops: [{ o: 0, c: '#ddd6f3' }, { o: 1, c: '#faaca8' }] },
      { name: 'p_cream', stops: [{ o: 0, c: '#fceabb' }, { o: 1, c: '#f8b500' }] },
      { name: 'p_lavender', stops: [{ o: 0, c: '#E0EAFC' }, { o: 1, c: '#CFDEF3' }] },
    ].map(g => ({ type: 'gradient', name: g.name, value: g.stops }))
  },
];

const App: React.FC = () => {
  // --- State ---
  const [language, setLanguage] = useState<Language>('en');
  const [config, setConfig] = useState<GridConfig>({ width: 256, height: 256, cellSize: 32 });
  const [showGrid, setShowGrid] = useState(true);
  
  // Resize Modal State
  const [isResizeModalOpen, setIsResizeModalOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState<GridConfig>({ width: 256, height: 256, cellSize: 32 });

  // Suggestions Modal State
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Language Menu State
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  // Color Picker Popover State
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerContainerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<GradientType>('solid'); 
  const [activeSolidColor, setActiveSolidColor] = useState('#3b82f6');
  const [activeStops, setActiveStops] = useState<ColorStop[]>(DEFAULT_STOPS);
  
  // History / Palette
  const [paletteHistory, setPaletteHistory] = useState<PaletteItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Accordion State
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'history': true,
    'basic_solids': true
  });
  
  // Selection State (for enabling/disabling buttons)
  const [selection, setSelection] = useState<SelectionBounds | null>(null);

  const gridRef = useRef<GridCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  const t = (key: string) => {
    // console.log(`t called with key: ${key}, lang: ${language}, result: ${translations[language]?.[key]}`);
    return translations[language]?.[key] || key;
  };
  const allCategoryKeys = useMemo(() => ['history', ...STATIC_LIBRARIES.map(c => c.id)], []);

  // Compute suggestions based on active color
  const suggestions = useMemo(() => {
    if (!showSuggestions) return [];
    return generateGradientSuggestions(activeSolidColor);
  }, [activeSolidColor, showSuggestions]);

  // Group suggestions by category
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, GradientSuggestion[]> = {};
    suggestions.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [suggestions]);

  // --- Click Outside Handler for Color Picker & Language Menu ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerContainerRef.current && !colorPickerContainerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    };
    if (showColorPicker || showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker, showLanguageMenu]);

  // --- Handlers ---
  
  const handleOpenResizeModal = () => {
    setTempConfig(config);
    setIsResizeModalOpen(true);
  };

  const handleTempConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTempConfig(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const saveResizeConfig = () => {
    setConfig(tempConfig);
    setIsResizeModalOpen(false);
  };

  const createPaletteItem = () => {
    // Check for duplicates
    const existingIndex = paletteHistory.findIndex(item => {
      if (item.type !== mode) return false;
      
      if (mode === 'solid') {
        return item.solidColor.toLowerCase() === activeSolidColor.toLowerCase();
      } else {
        // Gradient comparison
        if (item.gradientStops.length !== activeStops.length) return false;
        
        const itemStops = [...item.gradientStops].sort((a, b) => a.offset - b.offset);
        const currentStops = [...activeStops].sort((a, b) => a.offset - b.offset);
        
        return itemStops.every((s, i) => {
          const cs = currentStops[i];
          // Allow very small floating point diff for offset
          return Math.abs(s.offset - cs.offset) < 0.005 && 
                 s.color.toLowerCase() === cs.color.toLowerCase();
        });
      }
    });

    let newItem: PaletteItem;

    if (existingIndex !== -1) {
      // Exists: Move to top
      const itemToMove = paletteHistory[existingIndex];
      const newHistory = [...paletteHistory];
      newHistory.splice(existingIndex, 1);
      
      newItem = { ...itemToMove, createdAt: Date.now() };
      setPaletteHistory([newItem, ...newHistory]);
    } else {
      // Create new
      newItem = {
        id: generateUUID(),
        createdAt: Date.now(),
        type: mode,
        solidColor: activeSolidColor,
        gradientStops: [...activeStops], // Clone stops
      };
      setPaletteHistory(prev => [newItem, ...prev]);
    }
    
    setSelectedHistoryId(newItem.id);
    
    // Apply immediately to current selection if exists
    if (selection && gridRef.current) {
      gridRef.current.applyPaletteItem(newItem);
    }
  };

  const applyPreset = (definition: PresetDefinition) => {
    if (definition.type === 'solid') {
      const color = definition.value as string;
      setMode('solid');
      setActiveSolidColor(color);
      
      // Auto-apply if selection exists
      if (selection && gridRef.current) {
         gridRef.current.applyPaletteItem({
           id: 'temp', createdAt: 0, type: 'solid', solidColor: color, gradientStops: []
         });
      }
    } else {
      const stopsData = definition.value as Array<{o: number, c: string}>;
      const stops = stopsData.map(s => ({
        id: generateUUID(),
        offset: s.o,
        color: s.c
      }));
      
      // Keep current gradient direction or default to horizontal if in solid mode
      const newMode = mode === 'solid' ? 'linear-horizontal' : mode;
      
      setMode(newMode);
      setActiveStops(stops);
      
      if (selection && gridRef.current) {
        gridRef.current.applyPaletteItem({
          id: 'temp', createdAt: 0, type: newMode, solidColor: '#000000', gradientStops: stops
        });
      }
    }
  };

  const handleApplySuggestion = (suggestion: GradientSuggestion) => {
    setMode('linear-horizontal');
    setActiveStops(suggestion.stops);
    setShowSuggestions(false);
  };

  const applyFromHistory = (item: PaletteItem) => {
    // Load item settings into editor
    setMode(item.type);
    setActiveSolidColor(item.solidColor);
    setActiveStops(item.gradientStops);
    
    // Set as selected in UI
    setSelectedHistoryId(item.id);
    
    // Apply to grid
    if (selection && gridRef.current) {
      gridRef.current.applyPaletteItem(item);
    }
  };

  const handleDeleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPaletteHistory(prev => prev.filter(item => item.id !== id));
    if (selectedHistoryId === id) setSelectedHistoryId(null);
  };

  const handleExport = () => {
    gridRef.current?.exportImage();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && gridRef.current) {
      gridRef.current.importImage(file);
    }
    // clear value to allow re-upload same file
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => ({...prev, [id]: !prev[id]}));
  };

  const toggleAllCategories = () => {
    const allOpen = allCategoryKeys.every(key => openCategories[key]);
    const newState = allCategoryKeys.reduce((acc, key) => {
      acc[key] = !allOpen;
      return acc;
    }, {} as Record<string, boolean>);
    setOpenCategories(newState);
  };

  // --- Render Helpers ---

  const getPreviewStyle = (def: PresetDefinition): React.CSSProperties => {
    if (def.type === 'solid') {
      return { backgroundColor: def.value as string };
    } else {
      const stops = (def.value as Array<{o: number, c: string}>)
        .map(s => `${s.c} ${s.o * 100}%`)
        .join(', ');
      return { backgroundImage: `linear-gradient(to right, ${stops})` };
    }
  };

  const getHistoryPreviewStyle = (item: PaletteItem): React.CSSProperties => {
    if (item.type === 'solid') {
      return { backgroundColor: item.solidColor };
    } else {
      const direction = item.type === 'linear-horizontal' ? 'to right' : 'to bottom';
      const stops = item.gradientStops
        .sort((a, b) => a.offset - b.offset)
        .map(s => `${s.color} ${s.offset * 100}%`)
        .join(', ');
      return { backgroundImage: `linear-gradient(${direction}, ${stops})` };
    }
  };

  const getSuggestionPreviewStyle = (stops: ColorStop[]): React.CSSProperties => {
      const sorted = [...stops].sort((a, b) => a.offset - b.offset);
      const str = sorted.map(s => `${s.color} ${s.offset * 100}%`).join(', ');
      return { backgroundImage: `linear-gradient(to right, ${str})` };
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 text-gray-200 font-sans overflow-hidden">
      
      {/* Top Bar: Configuration */}
      <header className="h-14 border-b border-gray-800 bg-gray-900 px-4 flex items-center justify-between shrink-0 z-30 shadow-md relative">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center">
             <GridIcon size={18} className="text-white" />
          </div>
          <h1 className="font-bold text-base tracking-tight text-white">{t('app_title')}<span className="text-blue-400 font-light">{t('app_title_suffix')}</span></h1>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => setShowGrid(!showGrid)}
             className={`p-2 rounded flex items-center gap-2 text-xs font-medium transition-colors ${showGrid ? 'bg-gray-800 text-blue-400 hover:text-blue-300' : 'text-gray-400 hover:text-gray-200'}`}
             title={showGrid ? t('hide_grid') : t('show_grid')}
          >
            {showGrid ? <Eye size={16} /> : <EyeOff size={16} />}
            <span>{showGrid ? t('edit_mode') : t('preview_mode')}</span>
          </button>

          <div className="h-6 w-px bg-gray-700 mx-2"></div>

          <button 
             onClick={handleOpenResizeModal}
             className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-xs"
             title={t('grid_settings')}
          >
            <Settings size={16} />
            <span>{config.width}x{config.height}</span>
          </button>
          
          <button 
             onClick={() => gridRef.current?.reset()}
             className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
             title={t('clear_grid')}
          >
            <RefreshCw size={16} />
          </button>

          {/* Language Switcher */}
          <div className="relative" ref={languageMenuRef}>
            <button
               onClick={() => setShowLanguageMenu(!showLanguageMenu)}
               className="p-2 hover:bg-gray-800 rounded text-xl hover:scale-110 transition-transform flex items-center gap-1"
               title="Switch Language"
            >
              <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag || '🌐'}</span>
            </button>
            
            {showLanguageMenu && (
              <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[150px] z-50 animate-in fade-in slide-in-from-top-1 duration-150 py-1">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLanguageMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-gray-800 transition-colors ${
                      language === lang.code ? 'bg-gray-800 text-white font-medium' : 'text-gray-400'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-gray-700 mx-2"></div>

          <a 
            href="https://github.com/jinruozai/palette_maker" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-2 rounded-md bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-500 text-white transition-all shadow-sm"
            title={t('view_source')}
          >
            <Github size={16} />
          </a>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left/Center: Canvas Area - MAXIMIZED */}
        <section className="flex-1 bg-gray-950 relative overflow-hidden flex flex-col">
          {/* Canvas Container */}
          <div className="flex-1 w-full h-full p-2">
            <GridCanvas 
              ref={gridRef} 
              config={config} 
              showGrid={showGrid}
              onSelectionChange={setSelection} 
            />
          </div>
        </section>

        {/* Right Panel: Controls */}
        <aside className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col shrink-0 z-20 shadow-xl">
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            
            {/* Unified Control Card */}
            <div className="mb-6 flex flex-col bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-sm">
               
               {/* Header: Mode Tabs */}
               <div className="flex border-b border-gray-700 bg-gray-900/50">
                 <button
                   onClick={() => setMode('solid')}
                   className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wide transition-all relative ${
                     mode === 'solid' 
                       ? 'text-white bg-gray-800' 
                       : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                   }`}
                 >
                   <PaintBucket size={14} />
                   {t('solid')}
                   {mode === 'solid' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />}
                 </button>
                 <div className="w-px bg-gray-700" />
                 <button
                   onClick={() => setMode('linear-horizontal')}
                   className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wide transition-all relative ${
                     mode !== 'solid' 
                       ? 'text-white bg-gray-800' 
                       : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                   }`}
                 >
                   <BarChart size={14} className="rotate-90" />
                   {t('gradient')}
                   {mode !== 'solid' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />}
                 </button>
               </div>

               {/* Body: Editor Content */}
               <div className="p-4 bg-gray-800 min-h-[140px] flex flex-col justify-center">
                  {mode === 'solid' ? (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                       <div className="flex items-center gap-4">
                          {/* Large Color Preview / Picker Trigger */}
                          <div className="relative group" ref={colorPickerContainerRef}>
                             <button
                               onClick={() => setShowColorPicker(!showColorPicker)}
                               className="w-14 h-14 rounded-lg shadow-inner border-2 border-gray-600 group-hover:border-gray-400 transition-all active:scale-95"
                               style={{ backgroundColor: activeSolidColor }}
                               title={t('pick_color')}
                             />
                             {/* Color Picker Popover */}
                             {showColorPicker && (
                               <div className="absolute top-16 left-0 z-50 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-64 animate-in fade-in slide-in-from-top-2 duration-150">
                                  <ColorPicker color={activeSolidColor} onChange={setActiveSolidColor} />
                                  <div className="mt-2 text-center text-[10px] text-gray-500 uppercase tracking-wider">
                                     {t('drag_to_select')}
                                  </div>
                               </div>
                             )}
                          </div>

                          {/* Hex Input & Suggestion */}
                          <div className="flex-1 flex flex-col gap-2">
                             <div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">{t('hex_code')}</span>
                                <div className="flex items-center bg-gray-900 rounded border border-gray-700 px-2 py-1.5 focus-within:border-blue-500 transition-colors">
                                   <span className="text-gray-500 text-sm mr-1">#</span>
                                   <input 
                                     type="text" 
                                     value={activeSolidColor.replace('#','').toUpperCase()} 
                                     onChange={(e) => setActiveSolidColor('#' + e.target.value)}
                                     className="bg-transparent text-sm font-mono text-white focus:outline-none w-full"
                                   />
                                </div>
                             </div>
                             
                             <button 
                               onClick={() => setShowSuggestions(true)}
                               className="flex items-center gap-2 text-[10px] text-blue-400 hover:text-blue-300 transition-colors self-start py-1"
                               title={t('suggest_gradients')}
                             >
                               <Wand2 size={12} />
                               <span>{t('suggest_gradients')}</span>
                             </button>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                      <GradientEditor 
                         stops={activeStops} 
                         onChange={setActiveStops}
                         gradientType={mode}
                         onTypeChange={setMode}
                      />
                    </div>
                  )}
               </div>

               {/* Footer: Action Button */}
               <div className="p-3 bg-gray-900/30 border-t border-gray-700">
                 <button
                   onClick={createPaletteItem}
                   className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${
                     selection 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white'
                   }`}
                 >
                   <Plus size={16} strokeWidth={3} />
                   {selection ? t('apply_to_selection') : t('add_to_palette')}
                 </button>
               </div>
            </div>

            {/* Palette Library */}
            <div className="flex-1 min-h-0 flex flex-col border-t border-gray-800 pt-2 -mx-2">
              <div className="flex items-center justify-between px-4 mb-2">
                 <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('palette_library')}</h3>
                 <button 
                   onClick={toggleAllCategories}
                   className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
                   title={t('toggle_all')}
                 >
                   <ChevronsUpDown size={14} />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
                
                {/* 1. User History Category */}
                <div className="mb-1 rounded overflow-hidden border border-gray-700/50">
                   <button 
                      onClick={() => toggleCategory('history')}
                      className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-700 transition-colors text-xs font-bold uppercase tracking-wider text-gray-300"
                   >
                     <span>{t('my_palette')} ({paletteHistory.length})</span>
                     {openCategories['history'] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                   </button>
                   
                   {openCategories['history'] && (
                     <div className="bg-gray-900 p-2">
                        {paletteHistory.length === 0 ? (
                          <div className="text-center text-gray-600 text-[10px] py-2">{t('no_custom_colors')}</div>
                        ) : (
                          <div className="grid grid-cols-5 gap-1.5">
                            {paletteHistory.map(item => (
                              <button
                                key={item.id}
                                onClick={() => applyFromHistory(item)}
                                className={`w-10 h-10 rounded transition-all shadow-sm focus:outline-none relative group overflow-hidden ${
                                  selectedHistoryId === item.id 
                                    ? 'ring-2 ring-white border-transparent z-10 scale-105' 
                                    : 'border border-gray-700 hover:border-gray-500'
                                }`}
                                title={item.type}
                              >
                                <div className="absolute inset-0" style={getHistoryPreviewStyle(item)} />
                                <div 
                                  onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                                  className="absolute top-0 right-0 p-0.5 bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all rounded-bl"
                                >
                                  <Trash2 size={8} />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                     </div>
                   )}
                </div>

                {/* 2. Static Libraries */}
                {STATIC_LIBRARIES.map(category => (
                  <div key={category.id} className="mb-1 rounded overflow-hidden border border-gray-700/50">
                    <button 
                        onClick={() => toggleCategory(category.id)}
                        className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-700 transition-colors text-xs font-bold uppercase tracking-wider text-gray-400"
                    >
                      <span>{translations[language]?.[`cat_${category.id}`] || category.label}</span>
                      {openCategories[category.id] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    </button>
                    
                    {openCategories[category.id] && (
                      <div className="bg-gray-900 p-2">
                        <div className="grid grid-cols-5 gap-1.5">
                          {category.items.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => applyPreset(item)}
                              className="w-10 h-10 rounded transition-all shadow-sm focus:outline-none relative group overflow-hidden border border-gray-700 hover:border-gray-500"
                              title={item.name ? (t(item.name) || item.name) : (item.value as string)}
                            >
                              <div className="absolute inset-0" style={getPreviewStyle(item)} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-800 bg-gray-900">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <button
                onClick={handleImportClick}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors text-xs font-medium"
              >
                <Upload size={14} />
                {t('import')}
              </button>
              
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors text-xs font-medium shadow-lg shadow-green-900/20"
              >
                <Download size={14} />
                {t('export')}
              </button>
            </div>
          </div>

        </aside>

        {/* Resize Modal Overlay */}
        {isResizeModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-80 p-5 transform transition-all scale-100">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('grid_settings')}</h2>
                 <button onClick={() => setIsResizeModalOpen(false)} className="text-gray-500 hover:text-white">
                   <X size={16} />
                 </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-xs text-gray-400 font-medium">{t('texture_width')}</label>
                   <input 
                      type="number" 
                      name="width" 
                      value={tempConfig.width} 
                      onChange={handleTempConfigChange} 
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none text-sm"
                   />
                </div>
                
                <div className="space-y-1">
                   <label className="text-xs text-gray-400 font-medium">{t('texture_height')}</label>
                   <input 
                      type="number" 
                      name="height" 
                      value={tempConfig.height} 
                      onChange={handleTempConfigChange} 
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none text-sm"
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-xs text-gray-400 font-medium">{t('grid_cell_size')}</label>
                   <input 
                      type="number" 
                      name="cellSize" 
                      value={tempConfig.cellSize} 
                      onChange={handleTempConfigChange} 
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none text-sm"
                   />
                </div>
                
                <div className="pt-2 flex gap-3">
                   <button 
                     onClick={() => setIsResizeModalOpen(false)}
                     className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs font-medium border border-gray-700"
                   >
                     {t('cancel')}
                   </button>
                   <button 
                     onClick={saveResizeConfig}
                     className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium shadow-lg shadow-blue-900/20"
                   >
                     {t('confirm')}
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Suggestions Modal Overlay */}
        {showSuggestions && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-10">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col transform transition-all scale-100">
              <div className="flex justify-between items-center p-4 border-b border-gray-800">
                 <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded border border-gray-600" style={{ backgroundColor: activeSolidColor }}></div>
                    <h2 className="text-base font-bold text-white uppercase tracking-wider">{t('gradient_ideas')}</h2>
                 </div>
                 <button onClick={() => setShowSuggestions(false)} className="text-gray-500 hover:text-white">
                   <X size={20} />
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                {Object.entries(groupedSuggestions).map(([category, items]: [string, GradientSuggestion[]]) => (
                  <div key={category}>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{t(category) || category}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {items.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleApplySuggestion(suggestion)}
                          className="flex items-center gap-3 p-2 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 transition-all group text-left"
                        >
                          <div 
                            className="w-12 h-12 rounded border border-gray-600 group-hover:border-white/50 transition-colors shrink-0" 
                            style={getSuggestionPreviewStyle(suggestion.stops)}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-200 group-hover:text-white">{t(suggestion.name) || suggestion.name}</span>
                            <span className="text-[10px] text-gray-500 group-hover:text-blue-400">{t('apply_gradient')}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;