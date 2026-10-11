const {BrowserWindow,desktopCapturer,ipcMain,dialog}=require('electron');
const path=require('node:path');
const {isMediaOrigin,validRoomPath,APP_ORIGIN}=require('./links.cjs');
function captureAllowed(request,contents){try{return Boolean(request.userGesture&&request.videoRequested&&request.frame&&!request.frame.isDestroyed()&&request.frame.top===contents.mainFrame&&isMediaOrigin(request.securityOrigin)&&new URL(contents.getURL()).origin===APP_ORIGIN&&validRoomPath(new URL(contents.getURL()).pathname));}catch{return false;}}
function setupCapture(session,getWindow,onSelected){let active=null;
 const finish=source=>{const current=active;if(!current)return;active=null;clearTimeout(current.timer);if(!current.window.isDestroyed())current.window.destroy();const permitted=source&&captureAllowed(current.request,getWindow()?.webContents);try{current.callback(permitted?{video:source}:null);}catch{}if(permitted)onSelected(source);};
 ipcMain.handle('capture:list',event=>active&&event.sender===active.window.webContents?active.sources.map(s=>({id:s.id,name:s.name,type:s.id.startsWith('screen:')?'screen':'window',thumbnail:s.thumbnail.toDataURL()})):[]);
 ipcMain.on('capture:choose',(event,id)=>{if(!active||event.sender!==active.window.webContents)return;finish(active.sources.find(s=>s.id===id)||null);});
 ipcMain.on('capture:cancel',event=>{if(active&&event.sender===active.window.webContents)finish(null);});
 session.setDisplayMediaRequestHandler(async(request,callback)=>{
  const parent=getWindow();if(active||!parent||!captureAllowed(request,parent.webContents)){callback(null);return;}
  try{const sources=await desktopCapturer.getSources({types:['screen','window'],thumbnailSize:{width:320,height:180},fetchWindowIcons:false});if(!captureAllowed(request,parent.webContents)){callback(null);return;}if(!sources.length){callback(null);void dialog.showMessageBox(parent,{type:'info',message:'Nenhuma tela ou janela disponível.',detail:'Confira a permissão do Lessonara em Ajustes do Sistema → Privacidade e Segurança → Gravação de Tela. Depois abra a chamada novamente.',buttons:['OK']});return;}
   const picker=new BrowserWindow({width:900,height:640,minWidth:600,minHeight:440,parent,modal:true,title:'Compartilhar tela · Lessonara',webPreferences:{preload:path.join(__dirname,'capture-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
   active={window:picker,sources,request,callback,timer:setTimeout(()=>finish(null),180000)};
   picker.webContents.setWindowOpenHandler(()=>({action:'deny'}));picker.webContents.on('will-navigate',e=>e.preventDefault());picker.on('closed',()=>{if(active?.window===picker)finish(null);});await picker.loadFile(path.join(__dirname,'capture.html'));
  }catch{if(active?.callback===callback)finish(null);else callback(null);}
 },{useSystemPicker:false});
 return()=>finish(null);
}
module.exports={captureAllowed,setupCapture};
