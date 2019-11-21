const electron = require('electron')
const {ipcMain,BrowserWindow, app, Menu, Tray} = electron
var path = require('path')
let appIcon = null

require('electron-reload')(__dirname,{
  electron: path.join(__dirname, 'node_modules', '','electron'),
  hardResetMethod:'exit'
});

app.on('ready', () => {  
  const {width,height} =  electron.screen.getPrimaryDisplay().workAreaSize
  //const win= new BrowserWindow({frame:false,resizeable:true, x:width-148,y:0,width:148, minWidth:148,maxWidth:148,height:200,minHeight:200,maxHeight:200,useContentSize:true,opacity:0.95, transparent:false, title:'squwbs',appIcon:__dirname + '/static/img/tray_icon.png',titleBarStyle:"default"})
  const win= new BrowserWindow({frame:true,resizeable:false, x:width-148,y:0,width:500, height:250,useContentSize:true,opacity:0.95, transparent:false, title:'squwbs',appIcon:__dirname + '/static/img/tray_icon.png',titleBarStyle:"default"})
  win.loadFile('index.html')
  
  ipcMain.on('print',function(event,line){
    console.log(line)
    event.sender.send('printReply',line)
  })
  
  const tray = new Tray( __dirname + '/static/img/tray_icon.png')

  tray.on('click',()=>{
    win.isVisible() ? win.hide() : win.show()
  })
  win.on('show',()=>{
    tray.setHighlightMode('never')

  })
  win.on('hide',()=>{
    tray.setHighlightMode('never')
  })
  win.on('quit',()=>{
    win.webContents.clearHistory()
  }
  )

})

