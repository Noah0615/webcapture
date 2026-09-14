const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('snapdeck',Object.freeze({
  capture:(items,options)=>ipcRenderer.invoke('capture',items,options),
  cancel:()=>ipcRenderer.invoke('cancel'),
  onProgress:callback=>{const listener=(_event,item)=>callback(item);ipcRenderer.on('capture:progress',listener);return()=>ipcRenderer.removeListener('capture:progress',listener);},
  sessions:()=>ipcRenderer.invoke('sessions:list'),
  addSession:url=>ipcRenderer.invoke('sessions:add',url),
  removeSession:id=>ipcRenderer.invoke('sessions:remove',id),
}));
