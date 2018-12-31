"""
var exec = require('child_process').exec;
exec('ls',["./static/python"],(err,resu,stderr)=>{console.log(resu)})

const execFile = require('child_process').execFile;
execFile('ls',["./static/python"],(err,resu,stderr)=>{console.log(resu)})

var spawn=require('child_process').spawn
var dialog = spawn('python',['./static/python/directoryDialog.py'])
dialog.stdout.on('data',function(data){console.log(new TextDecoder('utf-8').decode(data))})
"""

import sys

class DevNull:
    def write(self, msg):
        pass

sys.stderr = DevNull()

import tkinter
from tkinter.filedialog import askdirectory
root = tkinter.Tk()
img = tkinter.Image('photo',file='../icons/16x16.png')
#root.iconphoto(True,img)
root.tk.call('wm','iconphoto',root._w, img)
root.withdraw()
folder = askdirectory(parent=root,initialdir="/",title='Please select a directory to save your files.')
print(folder)
