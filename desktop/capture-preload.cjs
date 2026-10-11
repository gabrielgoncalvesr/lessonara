const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('capturePicker',{list:()=>ipcRenderer.invoke('capture:list'),choose:id=>ipcRenderer.send('capture:choose',id),cancel:()=>ipcRenderer.send('capture:cancel')});
