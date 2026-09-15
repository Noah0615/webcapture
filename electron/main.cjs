const {app,BrowserWindow,ipcMain,safeStorage,shell,session}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const {createHash,randomUUID}=require('node:crypto');
let mainWindow,engine,core,sessionLogin=false;
const entry=path.join(__dirname,'../dist/index.html');
const safeExternal=url=>{try{return ['http:','https:'].includes(new URL(url).protocol);}catch{return false;}};
const vaultPath=()=>path.join(app.getPath('userData'),'sessions.enc');
async function readVault(){
  if(!safeStorage.isEncryptionAvailable())throw new Error('OS 암호화 저장소를 사용할 수 없습니다.');
  try{return JSON.parse(safeStorage.decryptString(await fs.readFile(vaultPath())));}catch(e){if(e.code==='ENOENT')return {};throw new Error('세션 금고를 읽지 못했습니다. OS 키체인 상태를 확인해 주세요.');}
}
async function writeVault(data){
  if(!safeStorage.isEncryptionAvailable())throw new Error('OS 암호화 저장소를 사용할 수 없습니다.');
  await fs.mkdir(app.getPath('userData'),{recursive:true});
  const tmp=`${vaultPath()}.tmp`;await fs.writeFile(tmp,safeStorage.encryptString(JSON.stringify(data)),{mode:0o600});await fs.rename(tmp,vaultPath());
}
function trusted(event){if(!mainWindow||event.sender!==mainWindow.webContents||event.senderFrame!==mainWindow.webContents.mainFrame)throw new Error('허용되지 않은 요청입니다.');}
function createWindow(){
  mainWindow=new BrowserWindow({width:1440,height:1040,minWidth:760,minHeight:650,title:'SnapDeck',backgroundColor:'#f7f8fa',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  mainWindow.loadFile(entry);
  mainWindow.webContents.setWindowOpenHandler(({url})=>{if(safeExternal(url))void shell.openExternal(url);return {action:'deny'};});
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(url.split('#')[0]!==pathToFileURL(entry).href){event.preventDefault();if(safeExternal(url))void shell.openExternal(url);}});
  mainWindow.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  mainWindow.on('closed',()=>{mainWindow=null;void engine.cancel();});
}
app.whenReady().then(async()=>{
  core=await import('../core/capture.mjs');engine=new core.CaptureEngine();
  ipcMain.handle('capture',async(event,items,options)=>{trusted(event);let selected;if(options?.sessionId){const vault=await readVault();selected=vault[options.sessionId];if(!selected)throw new Error('저장된 세션을 찾지 못했습니다.');}await engine.run(items,options,item=>{if(!mainWindow?.isDestroyed())mainWindow?.webContents.send('capture:progress',item);},selected);});
  ipcMain.handle('cancel',async event=>{trusted(event);await engine.cancel();});
  ipcMain.handle('sessions:list',async event=>{trusted(event);return Object.values(await readVault()).map(({id,origin,updatedAt})=>({id,origin,updatedAt}));});
  ipcMain.handle('sessions:remove',async(event,id)=>{trusted(event);const vault=await readVault();delete vault[id];await writeVault(vault);});
  ipcMain.handle('sessions:add',async(event,raw)=>{
    trusted(event);const url=new URL(core.validateUrl(raw));
    if(sessionLogin)throw new Error('로그인 창이 이미 열려 있습니다.');
    if(!safeStorage.isEncryptionAvailable())throw new Error('OS 암호화 저장소를 사용할 수 없습니다.');
    sessionLogin=true;
    const loginSession=session.fromPartition(`login-${randomUUID()}`,{cache:false});
    loginSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
    loginSession.on('will-download',event=>event.preventDefault());
    const login=new BrowserWindow({width:1050,height:820,title:'SnapDeck · 로그인 완료 후 이 창을 닫으세요',webPreferences:{session:loginSession,contextIsolation:true,nodeIntegration:false,sandbox:true}});
    login.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    login.webContents.on('will-navigate',(event,target)=>{if(!safeExternal(target))event.preventDefault();});
    void login.loadURL(url.href);
    return new Promise((resolve,reject)=>{
      let closing=false;
      login.on('close',async event=>{
        if(closing)return;event.preventDefault();closing=true;
        try{
          const id=createHash('sha256').update(url.origin).digest('hex').slice(0,24);
          const cookies=(await loginSession.cookies.get({})).map(c=>({name:c.name,value:c.value,domain:c.domain,path:c.path,expires:c.expirationDate||-1,httpOnly:c.httpOnly,secure:c.secure,sameSite:c.sameSite==='strict'?'Strict':c.sameSite==='no_restriction'?'None':'Lax'}));
          let origins=[];
          if(new URL(login.webContents.getURL()).origin===url.origin){const localStorage=await login.webContents.executeJavaScript('Object.entries(localStorage).map(([name,value])=>({name,value}))');origins=[{origin:url.origin,localStorage}];}
          const record={id,origin:url.origin,updatedAt:new Date().toISOString(),state:{cookies,origins}};
          const vault=await readVault();vault[id]=record;await writeVault(vault);resolve({id,origin:record.origin,updatedAt:record.updatedAt});
        }catch(e){reject(e);}finally{sessionLogin=false;login.destroy();void loginSession.clearStorageData();}
      });
      login.on('closed',()=>{sessionLogin=false;});
    });
  });
  createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('before-quit',()=>{void engine?.cancel();});
