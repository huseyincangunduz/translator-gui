import { contextBridge, ipcRenderer } from 'electron';

// API'yi renderer process'e expose et
contextBridge.exposeInMainWorld('electronAPI', {
  // Klasör seçimi
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // Çoklu dosya seçimi
  selectFiles: (filters?: { name: string; extensions: string[] }[]) => 
    ipcRenderer.invoke('select-files', filters),
  
  // Dosya okuma
  readFile: (filePath: string) => 
    ipcRenderer.invoke('read-file', filePath),
  
  // Dosya yazma
  writeFile: (filePath: string, content: string) => 
    ipcRenderer.invoke('write-file', filePath, content),
  
  // Klasör tarama
  scanDirectory: (dirPath: string, extensions: string[]) => 
    ipcRenderer.invoke('scan-directory', dirPath, extensions)
});

// Type definitions için
export interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  selectFiles: (filters?: { name: string; extensions: string[] }[]) => Promise<string[]>;
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  scanDirectory: (dirPath: string, extensions: string[]) => Promise<{ success: boolean; files?: string[]; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
