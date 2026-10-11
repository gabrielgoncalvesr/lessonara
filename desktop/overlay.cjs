const {BrowserWindow,screen,ipcMain}=require('electron');const path=require('node:path');
function setupOverlay(onStop){let window=null,tool=null;
 const clear=()=>window?.webContents.send('overlay:clear');
 const close=()=>{if(window&&!window.isDestroyed())window.destroy();window=null;tool=null;};
 const set=(mode,displayId)=>{if(!mode){tool=null;if(window){window.setIgnoreMouseEvents(true,{forward:true});window.webContents.send('overlay:tool',null);}return;}const display=screen.getAllDisplays().find(d=>String(d.id)===String(displayId));if(!display)return;
  tool=mode;if(!window){window=new BrowserWindow({...display.bounds,frame:false,transparent:true,hasShadow:false,resizable:false,skipTaskbar:true,alwaysOnTop:true,title:'Lessonara · Anotações',webPreferences:{preload:path.join(__dirname,'overlay-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});window.setAlwaysOnTop(true,'floating');window.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',e=>e.preventDefault());window.webContents.once('did-finish-load',()=>window?.webContents.send('overlay:tool',tool));void window.loadFile(path.join(__dirname,'overlay.html'));window.on('closed',()=>{window=null;tool=null;});}
  window.setIgnoreMouseEvents(false);window.show();window.focus();window.webContents.send('overlay:tool',tool);
 };
 ipcMain.on('overlay:stop',event=>{if(window&&event.sender===window.webContents){set(null);onStop();}});
 return {set,clear,close};
}
module.exports={setupOverlay};
