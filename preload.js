const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
  load: () => ipcRenderer.invoke("data:load"),
  save: (d) => ipcRenderer.invoke("data:save", d),
  saveFile: (o) => ipcRenderer.invoke("file:save", o),
  openFile: (o) => ipcRenderer.invoke("file:open", o),
  savePDF: (o) => ipcRenderer.invoke("pdf:save", o),
  print: () => ipcRenderer.invoke("print"),
  openFolder: () => ipcRenderer.invoke("folder:open"),
  info: () => ipcRenderer.invoke("app:info"),
  readClipboard: () => ipcRenderer.invoke("clipboard:read"),
  lockCapture: (on) => ipcRenderer.invoke("lock:capture", on),
  onLockKey: (cb) => ipcRenderer.on("lock:key", (_e, d) => cb(d)),
  offLockKey: () => ipcRenderer.removeAllListeners("lock:key"),
  getMachineId: () => ipcRenderer.invoke("machine:getId"),
  licence: {
    getLocal:  ()      => ipcRenderer.invoke("licence:getLocal"),
    setLocal:  (d)     => ipcRenderer.invoke("licence:setLocal", d),
    clearLocal: ()     => ipcRenderer.invoke("licence:clearLocal"),
    verifier:  (cle)   => ipcRenderer.invoke("licence:verifier", cle),
    activer:   (o)     => ipcRenderer.invoke("licence:activer", o),
  },
  admin: {
    hasConfig:        ()  => ipcRenderer.invoke("admin:hasConfig"),
    getConfig:        ()  => ipcRenderer.invoke("admin:getConfig"),
    setConfig:        (c) => ipcRenderer.invoke("admin:setConfig", c),
    listerLicences:   ()  => ipcRenderer.invoke("admin:listerLicences"),
    creerLicence:     (o) => ipcRenderer.invoke("admin:creerLicence", o),
    modifierLicence:  (o) => ipcRenderer.invoke("admin:modifierLicence", o),
    supprimerLicence: (id)=> ipcRenderer.invoke("admin:supprimerLicence", id),
  }
});
