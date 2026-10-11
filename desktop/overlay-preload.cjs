const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('annotationOverlay',{onTool:callback=>ipcRenderer.on('overlay:tool',(_event,mode)=>callback(mode)),onClear:callback=>ipcRenderer.on('overlay:clear',()=>callback()),stop:()=>ipcRenderer.send('overlay:stop')});
