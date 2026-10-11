const {app,BrowserWindow,Menu,dialog,session,nativeImage}=require('electron');
const path=require('node:path');
const {APP_ORIGIN,deepLinkToUrl,isAppUrl,isMediaOrigin}=require('./links.cjs');
let mainWindow=null,pendingRoom=null;
app.setName('Lessonara');
const locked=app.requestSingleInstanceLock();
if(!locked)app.quit();
function focus(){if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}}
async function openLesson(value){const target=deepLinkToUrl(value);if(!target)return;const current=mainWindow?.webContents.getURL();if(current===target){focus();return;}if(current?.startsWith(APP_ORIGIN+'/classroom/')){const choice=await dialog.showMessageBox(mainWindow,{type:'question',title:'Trocar de aula',message:'Abrir outra aula?',detail:'Você sairá da sala atual. A troca só acontece quando você confirmar.',buttons:['Continuar na aula','Trocar de aula'],defaultId:0,cancelId:0});if(choice.response!==1)return;}
 pendingRoom=target;if(!mainWindow){if(app.isReady())createWindow();return;}focus();if(current&&!current.startsWith(APP_ORIGIN+'/login'))await mainWindow.loadURL(target);}
app.on('open-url',(event,url)=>{event.preventDefault();void openLesson(url);});
app.on('second-instance',(_event,args)=>{focus();const link=args.find(value=>value.startsWith('lessonara://'));if(link)void openLesson(link);});
function createWindow(){
 mainWindow=new BrowserWindow({width:1280,height:850,minWidth:850,minHeight:600,title:'Lessonara',backgroundColor:'#f5f7f6',webPreferences:{preload:path.join(__dirname,'preload.cjs'),partition:'persist:lessonara',contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
 mainWindow.webContents.setWindowOpenHandler(({url})=>{if(isAppUrl(url)){const parsed=new URL(url);if(parsed.pathname.startsWith('/classroom/'))void openLesson('lessonara://classroom'+parsed.pathname.slice('/classroom'.length));else void mainWindow.loadURL(url);}return {action:'deny'};});
 mainWindow.webContents.on('will-navigate',(event,url)=>{if(!isAppUrl(url)){event.preventDefault();void dialog.showMessageBox(mainWindow,{type:'info',message:'Abra esse recurso no navegador',detail:'Este app de teste mantém a navegação dentro do Lessonara. Configure a conexão Google pelo navegador.',buttons:['OK']});}});
 mainWindow.webContents.on('will-attach-webview',event=>event.preventDefault());
 const resumeLesson=(_event,url)=>{if(pendingRoom&&url===APP_ORIGIN+'/'){const room=pendingRoom;pendingRoom=null;void mainWindow.loadURL(room);}};
 mainWindow.webContents.on('did-navigate',resumeLesson);mainWindow.webContents.on('did-navigate-in-page',resumeLesson);
 mainWindow.webContents.on('render-process-gone',()=>{void dialog.showMessageBox(mainWindow,{type:'error',message:'Não foi possível continuar a janela da aula.',detail:'Abra o app novamente ou use a opção de entrar pelo navegador.',buttons:['OK']});});
 mainWindow.on('closed',()=>{mainWindow=null;});
 void mainWindow.loadURL(APP_ORIGIN+'/');
}
if(locked)app.whenReady().then(()=>{
 if(app.isPackaged)app.setAsDefaultProtocolClient('lessonara');
 const ses=session.fromPartition('persist:lessonara');
 ses.setPermissionCheckHandler((_contents,permission,origin)=>isMediaOrigin(origin)&&['media','display-capture','fullscreen'].includes(permission));
 const allowed=new Set();
 ses.setPermissionRequestHandler(async(_contents,permission,callback,details)=>{const origin=details.requestingUrl||details.embeddingOrigin||'';if(!isMediaOrigin(origin)||!['media','display-capture','fullscreen'].includes(permission)){callback(false);return;}if(permission==='fullscreen'||allowed.has(permission)){callback(true);return;}const answer=await dialog.showMessageBox(mainWindow,{type:'question',title:'Permissão para aula',message:permission==='display-capture'?'Permitir compartilhar sua tela nesta aula?':'Permitir câmera e microfone para a aula?',detail:'Você controla os dispositivos pelos botões da sala. O macOS também pode solicitar sua autorização.',buttons:['Agora não','Permitir'],defaultId:0,cancelId:0});if(answer.response===1)allowed.add(permission);callback(answer.response===1);});
 ses.setDisplayMediaRequestHandler((_request,callback)=>callback(null),{useSystemPicker:true});
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Lessonara',submenu:[{role:'about'},{type:'separator'},{role:'quit'}]},{label:'Editar',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'Janela',submenu:[{role:'minimize'},{role:'zoom'},{role:'togglefullscreen'}]}]));
 const icon=path.join(__dirname,'icon.png');if(app.dock)app.dock.setIcon(nativeImage.createFromPath(icon));
 createWindow();const initial=process.argv.find(value=>value.startsWith('lessonara://'));if(initial)void openLesson(initial);
});
app.on('activate',()=>{if(locked&&!mainWindow)createWindow();});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
