import { create } from 'zustand';
type Draft = { modality: 'dermoscopic' | 'tbp_3d' | 'smartphone'; image: string | null; age: string; sex: string; anatomical_location: string; set: (value: Partial<Draft>) => void; reset: () => void };
export const useDraft = create<Draft>((set) => ({ modality: 'dermoscopic', image: null, age: '', sex: '', anatomical_location: '', set: (value) => set(value), reset: () => set({ modality: 'dermoscopic', image: null, age: '', sex: '', anatomical_location: '' }) }));
