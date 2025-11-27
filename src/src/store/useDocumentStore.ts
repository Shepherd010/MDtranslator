import { create } from 'zustand';

export interface TranslationChunk {
  id: number;
  chunkIndex: number;
  rawText: string;
  translatedText: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

interface DocumentState {
  docId: string | null;
  rawContent: string;
  translatedContent: string;
  chunks: TranslationChunk[];
  isTranslating: boolean;
  layoutMode: 'split' | 'quad'; // split (2-pane), quad (4-pane)
  expandedPanel: 'none' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  setDocId: (id: string) => void;
  setRawContent: (content: string) => void;
  setTranslatedContent: (content: string) => void;
  setChunks: (chunks: TranslationChunk[]) => void;
  updateChunk: (index: number, data: Partial<TranslationChunk>) => void;
  setIsTranslating: (isTranslating: boolean) => void;
  setLayoutMode: (mode: 'split' | 'quad') => void;
  setExpandedPanel: (panel: 'none' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  docId: null,
  rawContent: '',
  translatedContent: '',
  chunks: [],
  isTranslating: false,
  layoutMode: 'split',
  expandedPanel: 'none',

  setDocId: (id) => set({ docId: id }),
  setRawContent: (content) => set({ rawContent: content }),
  setTranslatedContent: (content) => set({ translatedContent: content }),
  setChunks: (chunks) => set({ chunks }),
  updateChunk: (index, data) => set((state) => {
    const newChunks = [...state.chunks];
    // Find chunk by index
    const chunkIdx = newChunks.findIndex(c => c.chunkIndex === index);
    if (chunkIdx !== -1) {
        newChunks[chunkIdx] = { ...newChunks[chunkIdx], ...data };
    }
    
    // Reassemble translated content
    const assembled = newChunks
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map(c => c.translatedText || '') 
        .join(''); // Changed from \n\n to empty string as chunks might include newlines

    return { chunks: newChunks, translatedContent: assembled };
  }),
  setIsTranslating: (isTranslating) => set({ isTranslating }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setExpandedPanel: (panel) => set({ expandedPanel: panel }),
}));
