const {contextBridge}=require('electron');
contextBridge.exposeInMainWorld('lessonaraDesktop',Object.freeze({version:'0.1.0'}));
