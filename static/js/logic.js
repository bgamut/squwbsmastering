var {ipcRenderer,remote,app} = require('electron')
var dialog = remote.dialog
var fs = require('fs')
var WaveFile =require('wavefile')
var path = require('path')
var spawn=require('child_process').spawn
var content = 'some text to save into the file'
var pathlist
var itemslist=[]
var win = remote.getCurrentWindow()
var consoleContainer = document.getElementById('consoleContainer');
var targetEmail = document.getElementById('targetEmail');
var referenceTrackButton = document.getElementById('referenceButton');
var originalTrackButton = document.getElementById('originalButton');
var readButton = document.getElementById('read');
var cancelButton = document.getElementById('cancel');

consoleContainer.style.display='none'
targetEmail.style.display = 'none'
originalTrackButton.style.display = 'none'
readButton.style.display='none'
cancelButton.style.display='none'
var fileList = new Array;
var saveDirectory = "";
/*
btw 
var filename = path.parse(fullpath).base;
*/
var getPath = function(pathString){
    fs.readdir(pathString,(err,items)=>{
        for (var j in items){
            var extendedPath =path.join(pathString,items[j])
            if(fs.lstatSync(extendedPath).isDirectory()){
                getPath(extendedPath);
            }
            else{
                if(extendedPath.endsWith('.wav')){
                    console.log(extendedPath)
                    fileList.push(extendedPath)
                } 
            }
        }
    })
            
}

var openWindow =function(){
    
    /*
    var defPath="/"
    fs.readdir('/users',(err,restOfThePath)=>{
        console.log(restOfThePath)
        for (var i =restOfThePath.length-1; i>-1; i--){
            if(restOfThePath[i].startsWith(".")||restOfThePath[i]=="Guest"||restOfThePath[i]=="Shared"){
                restOfThePath.splice(i,1);
            }
        }
        if(restOfThePath[0]){
            console.log(restOfThePath[0]) 
            defPath = '/users/'+restOfThePath[0]
        }
        else{
            defPath='/users'
        }
    })
    
    defPath = app.getPath('Download')
    console.log(defPath)
    dialog.showOpenDialog({title:'Choose Save Directory',defaultPath:defPath,properties:['openFile','openDirectory','multiSelections','createDirectory','promptToCreate']},(pathlist)=>{
    */
   dialog.showOpenDialog({title:'Choose Save Directory',properties:['openFile','openDirectory','multiSelections','createDirectory','promptToCreate']},(pathlist)=>{
        console.log(pathlist)
        if(pathlist!==undefined){
            for (var i in pathlist){
                getPath(pathlist[i]);
            }
            console.log(fileList)
        }
    })
}
//openWindow()
var saveWindow=function(){
    dialog.showOpenDialog({properties:['openDirectory','createDirectory','promptToCreate'],title:'where would you like the save the file?',message:'where would you like the save the file?'},(pathName)=>{
        if(pathName===undefined){
            console.log("you didn't save the file")
        }
        else{
            console.log(pathName)
            saveDirectory=pathName;
        }
        /*
        fs.writeFile(fileName,content,(err)=>{
            if(err){
                alert('An error ocurred creating the file')
            }
            alert('The file has been saved')
        })
        */
    })
}
var print = function(line){
    ipcRenderer.send('print',line)
    ipcRenderer.once('printReply',function(event,line){
        console.log(line)
    })
}

//var originalFilePath
/*
var mainBufferLeft = new Array()
var mainBufferStereo=false;
var mainBufferSampleRate
var mainBufferRight = new Array()
var mainBufferMono = new Array()
var mainBufferRightOnly = new Array()
var mainBufferLeftOnly = new Array()
var left 
var right
var mainMono 
var leftOnly
var mainMonoMean = 0
var mainSideMean = 0
var mainMonoVariance = 0
var mainSideVariance = 0
var absLeft
var absRight
var channels 
var mainBitrate 
var mainMaxNumber = 0;
var mainSubchunk 
var mainBitdepth 
var sampleLength 
var mainBitsPerSample 
var mainOnline = false
*/
var targetaddress=null
var barkscale = [175,2750,19500]
function LP(freq,sr){
    this.buf0 = 0
    this.buf1 = 0
    this.buf2 = 0
    this.buf3 = 0
    this.buf4 = 0
    this.buf5 = 0
    this.buf6 = 0
    this.buf7 = 0
    this.cutoff=2*Math.sin(Math.PI*(freq/sr))
}
LP.prototype.process=function(sample){
    this.buf0 += this.cutoff * (sample - this.buf0)
    this.buf1 += this.cutoff * (this.buf0 - this.buf1)
    this.buf2 += this.cutoff * (this.buf1 - this.buf2)
    this.buf3 += this.cutoff * (this.buf2 - this.buf3)
    this.buf4 += this.cutoff * (this.buf3 - this.buf4)
    this.buf5 += this.cutoff * (this.buf4 - this.buf5)
    this.buf6 += this.cutoff * (this.buf5 - this.buf6)
    this.buf7 += this.cutoff * (this.buf6 - this.buf7)
    return this.buf1
}
LP.prototype.output=function(mode){
    if(mode =="6"){
        return this.buf0
    }
    else if(mode ="12"){
        return this.buf1
    }
    else if(mode ="24"){
        return this.buf3
    }
    else if(mode ="48"){
        return this.buf7
    }
}
function HP(freq,sr){
    this.buf0 = 0;
    this.buf1 = 0;
    this.buf2 = 0;
    this.buf3 = 0;
    this.buf4 = 0;
    this.buf5 = 0;
    this.buf6 = 0;
    this.buf7 = 0;
    this.cutoff=2*Math.sin(Math.PI*(freq/sr));
}
HP.prototype.process=function(sample){
    this.buf0 += this.cutoff * (sample - this.buf0)
    this.buf1 += this.cutoff * (this.buf0 - this.buf1)
    this.buf2 += this.cutoff * (this.buf1 - this.buf2)
    this.buf3 += this.cutoff * (this.buf2 - this.buf3)
    this.buf4 += this.cutoff * (this.buf3 - this.buf4)
    this.buf5 += this.cutoff * (this.buf4 - this.buf5)
    this.buf6 += this.cutoff * (this.buf5 - this.buf6)
    this.buf7 += this.cutoff * (this.buf6 - this.buf7)
    return (sample - this.buf1)
}
HP.prototype.output=function(mode){
    if(mode =="6"){
        return (sample - this.buf0)
    }
    else if(mode ="12"){
        return (sample - this.buf1)
    }
    else if(mode ="24"){
        return (sample - this.buf3)
    }
    else if(mode ="48"){
        return (sample - this.buf7)
    }
}

function track(){
    track.prototype.filePath = null;
    track.prototype.bufferLeft=new Array();
    track.prototype.bufferRight=new Array();
    track.prototype.bufferMono=new Array();
    track.prototype.bufferRightOnly=new Array();
    track.prototype.bufferLeftOnly=new Array();
    track.prototype.sampleRate=0;
    track.prototype.maxNumber=0;
    track.prototype.monoMean=0;
    track.prototype.sideMean=0;
    track.prototype.monoVariance=0;
    track.prototype.sideVariance=0;
    track.prototype.bufferStereo=false;
    track.prototype.online=false;
    track.prototype.left=null;
    track.prototype.right=null;
    track.prototype.mono=null;
    track.prototype.leftOnly=null;
    track.prototype.absLeft=null;
    track.prototype.absRight=null;
    track.prototype.channels=null;
    track.prototype.bitrate=null;
    track.prototype.subchunk=null;
    track.prototype.bitdepth=null;
    track.prototype.sampleLength=null;
    track.prototype.bitsPerSample=null;
    track.prototype.arrayBuffer=null;
    track.prototype.eight=null;
    track.prototype.onesix=null;
    track.prototype.twofour=null;
    track.prototype.monoHPArray=new Array(barkscale.length);
    track.prototype.sideHPArray=new Array(barkscale.length);
    track.prototype.monoLPArray=new Array(barkscale.length);
    track.prototype.sideLPArray=new Array(barkscale.length);
    track.prototype.monoMatrix=new Array(barkscale.length+1);
    track.prototype.sideMatrix=new Array(barkscale.length+1);
    track.prototype.monoMeanArray=new Array(barkscale.length+1);
    track.prototype.sideMeanArray=new Array(barkscale.length+1);
    track.prototype.monoDeviationArray=new Array(barkscale.length+1);
    track.prototype.sideDeviationArray=new Array(barkscale.length+1);
    track.prototype.newMatrix = function(){
        for (var i =0; i<barkscale.length+1; i++){
            this.monoMatrix[i] =new Array(this.sampleLength);
            this.sideMatrix[i] = new Array(this.sampleLength);
            this.monoMeanArray[i]=0.0
            this.sideMeanArray[i]=0.0
            this.monoDeviationArray[i]=0.0
            this.sideDeviationArray[i]=0.0
            if(i<barkscale.length){
                this.monoHPArray[i]=new HP(barkscale[i],this.sampleRate)
                this.sideHPArray[i]=new HP(barkscale[i],this.sampleRate)
                this.monoLPArray[i]=new LP(barkscale[i],this.sampleRate)
                this.sideLPArray[i]=new LP(barkscale[i],this.sampleRate)
            }
        }
    }
    track.prototype.enterTheMatrix=function(){
        for (var i =0; i<barkscale.length+1; i++){
            if (i==0){
                for (var j = 0; j<this.sampleLength; j++){
                    var tempMono =this.monoLPArray[i].process(track.mono[j])
                    var tempSide =this.sideLPArray[i].process(track.leftOnly[j])
                    this.monoMatrix[i][j]=tempMono
                    this.sideMatrix[i][j]=tempSide
                    this.monoMeanArray[i]+=Math.abs(tempMono)/this.sampleLength
                    this.sideMeanArray[i]+=Math.abs(tempSide)/this.sampleLength
                }
            }
            else if(i==barkscale.length){
                for (var j = 0; j<this.sampleLength; j++){
                    var tempMono =this.monoHPArray[i].process(track.mono[j])
                    var tempSide =this.sideHPArray[i].process(track.leftOnly[j])
                    this.monoMatrix[i][j]=tempMono
                    this.sideMatrix[i][j]=tempSide
                    this.monoMeanArray[i]+=Math.abs(tempMono)/track.sampleLength
                    this.sideMeanArray[i]+=Math.abs(tempSide)/track.sampleLength
                }
            }
            else{
                for (var j = 0; j<track.sampleLength; j++){
                    var tempMono = track.monoLPArray[i].process(track.monoHPArray[i-1].process(track.mono[j]))
                    var tempSide = track.sideLPArray[i].process(track.sideHPArray[i-1].process(track.leftOnly[j]))
                    track.monoMatrix[i][j]=tempMono
                    track.sideMatrix[i][j]=tempSide
                    track.monoMeanArray[i]+=Math.abs(tempMono)/track.sampleLength
                    track.sideMeanArray[i]+=Math.abs(tempSide)/track.sampleLength
                }
            }
            
            }
            for (var i =0; i<barkscale.length; i++){
                for (var j = 0; j<track.sampleLength; j++){
                    track.monoDeviationArray[i] +=  (Math.abs(track.monoMatrix[i][j])-track.monoMeanArray[i])/track.sampleLength;
                    track.sideDeviationArray[i] +=  (Math.abs(track.sideMatrix[i][j])-track.sideMeanArray[i])/track.sampleLength;
                }
            }
    }
    
}
var mainObj = new track()
var referenceObj = new track()
/*
var mainObj = {
    filePath:null,
    bufferLeft:new Array(),
    bufferRight:new Array(),
    bufferMono:new Array(),
    bufferRightOnly:new Array(),
    bufferLeftOnly:new Array(),
    bufferSampleRate:44100,
    maxNumber:0,
    monoMean:0,
    sideMean:0,
    monoVariance:0,
    sideVariance:0,
    bufferStereo:false,
    online:false,
    left:null ,
    right:null,
    mono:null ,
    leftOnly:null,
    absLeft:null,
    absRight:null,
    channels:null,
    bitrate:null,
    subchunk:null,
    bitdepth:null,
    sampleLength:null,
    bitsPerSample:null,
    arrayBuffer:null,
    eight:null,
    onesix:null,
    twofour:null,
}
var referenceObj = {
    bufferLeft:new Array(),
    bufferRight:new Array(),
    bufferMono:new Array(),
    bufferRightOnly:new Array(),
    bufferLeftOnly:new Array(),
    bufferSampleRate:44100,
    maxNumber:0,
    monoMean:0,
    sideMean:0,
    monoVariance:0,
    sideVariance:0,
    bufferStereo:false,
    online:false,
    left:null ,
    right:null,
    mono:null ,
    leftOnly:null,
    absLeft:null,
    absRight:null,
    channels:null,
    bitrate:null,
    subchunk:null,
    bitdepth:null,
    sampleLength:null,
    bitsPerSample:null,
    arrayBuffer:null,
    eight:null,
    onesix:null,
    twofour:null,
}
*/
function eightToOneSix(numberArray,indexStart){
    if (numberArray[indexStart]<0){
        return (256+numberArray[indexStart]+(numberArray[indexStart+1]<<8))
    }
    else {
        return (numberArray[indexStart]+(numberArray[indexStart+1]<<8))
    }

}
function eightToTwoFour(numberArray,indexStart){
    if (numberArray[indexStart]<0){
        return (256+numberArray[indexStart]+(numberArray[indexStart+1]<<8)+(numberArray[indexStart+2]<<8<<8))
    }
    else {
        return (numberArray[indexStart]+(numberArray[indexStart+1]<<8)+(numberArray[indexStart+2]<<8<<8))
    }

}
function eightToThreeTwo(numberArray,indexStart){
    if (numberArray[indexStart]<0){
        return (256+numberArray[indexStart]+(numberArray[indexStart+1]<<8)+(numberArray[indexStart+2]<<8<<8)+(numberArray[indexStart+3]<<8<<8<<8))
    }
    else {
        return numberArray[indexStart]+(numberArray[indexStart+1]<<8)+(numberArray[indexStart+2]<<8<<8)+(numberArray[indexStart+3]<<8<<8<<8)
    }
}
var wav
function fileSelect(evt,obj){
        var files= evt.target.files;
        //originalFilePath= files[0];
        obj.filePath=files[0];        
        reader = new FileReader();
        if(obj.filePath!==null){
            
            //wav.toBitDepth(32)
            //wav.toBuffer()
            reader.readAsArrayBuffer(obj.filePath);
            reader.onerror = errorHandler;
            reader.onabort = function(e) {
            alert('File read cancelled');
            };
                reader.onload = function(e) {
                    console.log('entered reader')
                    obj.arrayBuffer = this.result;               
                    obj.eight = new Int8Array(obj.arrayBuffer)
                    obj.onesix = new Int16Array(obj.eight.length/2)
                    for (var i = 0; i<obj.eight.length/2; i++){
                        obj.onesix[i]=((obj.eight[2*i])+(obj.eight[2*i+1]<<8))
                    }
                    obj.twofour = new Array(obj.eight.length/2)
                    {
                        obj.twofour[i]=((obj.eight[3*i])+(obj.eight[3*i+1]<<8)+(obj.eight[3*i+2]<<8<<8))
                    }
                    
                    //obj.bufferSampleRate = obj.eight[24]+((256+obj.eight[25])<<8)
                    //obj.bufferSampleRate = wav.fmt.sampleRate;
                    obj.channels = eightToOneSix(obj.eight,22)
                    obj.bitrate = eightToThreeTwo(obj.eight,28)/obj.bufferSampleRate/obj.channels*8
                    obj.maxNumber = 0;
                    obj.subchunk = eightToThreeTwo(obj.eight,20)
                    obj.bitdepth = obj.bitrate/8;
                    obj.sampleLength = (eightToThreeTwo(obj.eight,4)-36)/obj.bitdepth/obj.channels
                    obj.bitsPerSample = eightToOneSix(obj.eight, 34)/obj.channels

                    //var tempBuffer =new Int32Array(obj.sampleLength*4)


                    if(obj.bitrate==16 && obj.channels==2){
                        for (var i=0; i<Math.ceil(obj.sampleLength); i++){
                            obj.left = eightToOneSix(obj.eight,44+4*i)
                            obj.right = eightToOneSix(obj.eight,44+4*i+2)
                            obj.mono = (obj.left+obj.right)/(2)
                            obj.leftOnly = obj.left-obj.mono
                            obj.absLeft[i] = Math.abs(obj.left)
                            obj.absRight[i] = Math.abs(obj.right)
                            if(obj.maxNumber<obj.absLeft||obj.maxNumber<obj.absRight){
                                (obj.left>obj.right) ? obj.maxNumber = obj.absLeft : obj.maxNumber = obj.absRight;
                            }
                            obj.bufferLeft.push(obj.left)
                            obj.bufferRight.push(obj.right)
                            obj.bufferMono.push(obj.mono)
                            obj.bufferLeftOnly.push(obj.leftOnly)
                            obj.monoMean+=Math.abs(obj.mono)/obj.sampleLength
                            obj.sideMean+=Math.abs(obj.leftOnly)/obj.sampleLength
                        };
                    }
                    else if (obj.bitrate==16 && obj.channels ==1){
                        
                        for (var i=0; i<Math.ceil(obj.sampleLength); i++){
                            obj.left = (eightToOneSix(obj.eight,44+2*i))
                            obj.absLeft = Math.abs(obj.left)
                            if(obj.maxNumber<obj.absLeft){
                                obj.maxNumber = obj.absLeft;
                            }
                            obj.bufferLeft.push(obj.left)
                            obj.bufferRight.push(obj.left)
                            obj.bufferMono.push(obj.left)
                            obj.bufferLeftOnly.push(0)
                            obj.monoMean+=Math.abs(obj.left)/obj.sampleLength
                        };
                    };
                    if(obj.bitrate==24 && obj.channels ==2){
                        for (var i=0; i<obj.sampleLength; i++){
                            obj.left = (eightToTwoFour(obj.eight,44+6*i))
                            obj.right = (eightToTwoFour(obj.eight,44+6*i+3))
                            obj.absLeft = Math.abs(obj.left)
                            obj.absRight = Math.abs(obj.right)
                            obj.mono = (obj.left+obj.right)/(2)
                            obj.leftOnly = obj.left-obj.mono
                            if(obj.maxNumber<obj.absLeft||obj.maxNumber<obj.absRight){
                                (obj.absLeft>obj.absRight) ? obj.maxNumber = obj.absLeft : obj.maxNumber = obj.absRight;
                            }
                            obj.bufferLeft.push(obj.left)
                            obj.bufferRight.push(obj.right)
                            obj.bufferMono.push(obj.mono)
                            obj.bufferLeftOnly.push(obj.leftOnly)
                            obj.monoMean+=Math.abs(obj.mono)/obj.sampleLength
                            obj.sideMean+=Math.abs(obj.leftOnly)/obj.sampleLength
                        }
                    }
                    else if(obj.bitrate==24 && obj.channels ==1){
                        for (var i=0; i<obj.sampleLength; i++){
                            obj.left = (eightToTwoFour(obj.eight,44+3*i))
                            obj.absLeft = Math.abs(obj.left)
                            if(obj.maxNumber<obj.absLeft){
                                obj.maxNumber = obj.absLeft;
                            }
                            obj.bufferLeft.push(obj.left)
                            obj.bufferRight.push(obj.left)
                            obj.bufferMono.push(obj.left)
                            obj.bufferLeftOnly.push(0)
                            obj.monoMean+=Math.abs(obj.left)/obj.sampleLength
                        }
                    }
                    if(obj.bitrate==32 && obj.channels==2){
                        for (var i=0; i<obj.sampleLength; i++){
                            obj.left = eightToThreeTwo(obj.eight,44+8*i)
                            obj.right = eightToThreeTwo(obj.eight,44+8*i+4)
                            obj.absLeft = Math.abs(obj.left)
                            obj.absRight = Math.abs(obj.right)
                            obj.mono = (obj.left+obj.right)/(2)
                            obj.leftOnly = obj.left-obj.mono
                            if(obj.maxNumber<obj.absLeft||obj.maxNumber<obj.absRight){
                                (obj.absLeft>obj.absRight) ? obj.maxNumber = obj.absLeft : obj.maxNumber = obj.absRight;
                            }
                            obj.bufferLeft.push(obj.left)
                            obj.bufferRight.push(obj.right)
                            obj.bufferMono.push(obj.mono)
                            obj.bufferLeftOnly.push(obj.leftOnly)
                            obj.monoMean+=Math.abs(obj.mono)/obj.sampleLength
                            obj.sideMean+=Math.abs(leftOnly)/obj.sampleLength
                        };
                    }
                    else if (obj.bitrate==32 && obj.channels ==1){
                        for (var i=0; i<obj.sampleLength; i++){
                            obj.left = eightToThreeTwo(obj.eight,44+4*i)
                            obj.absLeft = Math.abs(obj.left)
                            if(obj.maxNumber<obj.absLeft){
                                obj.maxNumber = obj.absLeft;
                            }
                            obj.bufferLeft.push(obj.left)
                            obj.bufferRight.push(obj.left)
                            obj.bufferMono.push(obj.left)
                            obj.bufferLeftOnly.push(0)
                            obj.monoMean+=Math.abs(obj.left)/obj.sampleLength
                        };
                    };
                    obj.monoMean = obj.monoMean/obj.maxNumber
                    obj.sideMean = obj.sideMean/obj.maxNumber
                    for (var i=0; i<obj.bufferLeft.length; i++){
                        /*
                        obj.bufferLeft[i]=(obj.bufferLeft[i])/obj.maxNumber;
                        obj.bufferRight[i]=(obj.bufferRight[i])/obj.maxNumber;
                        obj.bufferMono[i]=(obj.bufferMono[i]/obj.maxNumber);
                        obj.bufferLeftOnly[i]=obj.bufferLeftOnly[i]/obj.maxNumber;
                        */
                
                        obj.monoVariance += Math.abs(Math.abs(obj.bufferMono[i])-obj.monoMean)/obj.sampleLength
                        obj.sideVariance += Math.abs(Math.abs(obj.bufferLeft[i])-obj.sideMean)/obj.sampleLength

                    }; 
                    for(var i in obj){
                        if(obj[i]==null){
                            delete obj[i]
                        }
                        else if (obj[i][0]==undefined){
                            delete obj[i]
                        }
                    }
                    obj.online = true;    
            }
        }
        
};
var referenceTrackSelect = function(evt){
    document.getElementById('referenceFile').addEventListener('change',readFile,false);
    function readFile(evt,referencObj){
        fileSelect(evt,referenceObj)
        if(mainObj.online=true){
            referenceObj.enterTheMatrix(barkscale)
            mainObj.enterTheMatrix(barkscale)
            reconstruct()
        }
    }
};
function originalTrackSelect(evt){
    document.getElementById('originalFile').addEventListener('change',readFile,false);
    function readFile(evt){
        fileSelect(evt,mainObj)
        if(referenceObj.online==true){
            mainObj.enterTheMatrix(barkscale)
            referencObj.enterTheMatrix(barkscale)
            reconstruct()
        }
    }
};
/*
function selectSaveDirectory(){
    var dialog = spawn("python",[./static/python/directoryDialog.py])
    dialog.stdout.on('data',function(data){saveDirectory=new TextDecoder('utf-8').decode(data)})
}
*/
/*
function selectSaveDirectory(){
    var dialog = spawn("./static/python/dist/directoryDialog")
    dialog.stdout.on('data',function(data){saveDirectory=new TextDecoder('utf-8').decode(data)})
}
*/
/*
function selectSaveDirectory(){
    var {PythonShell} =require('python-shell');
    var options = {
        mode:'text',
        pythonOptions:['-u'],
        pythonPath:'/Users/bernardahn/anaconda3/bin/python',
        scriptPath:__dirname+'/static/python/'
    }
    
   PythonShell.runString("import tkinter from tkinter.filedialog; import askdirectory; root = tkinter.Tk();  root.withdraw(); folder = askdirectory(parent=root,initialdir='/',title='Please select a directory to save your files.'); print(folder);", options, function (err, results) {
    console.log(results)
  });
}
*/
/*
function SaveButtonPressed(evt){
    document.getElementById('saveDirectory').addEventListener('change',readFile,false);
    function readFile(evt){
        fileSelect(evt,mainObj)
        if(referenceObj.online==true){
            mainObj.enterTheMatrix(barkscale)
            referencObj.enterTheMatrix(barkscale)
            reconstruct()
        }
    }
}
*/
/*
var handleMainFileSelect=function(evt){
    mainFileSelect(evt).then(function(val){
        mainOnline=true;
        print('mainOnline : '+mainOnline);
    });
};
*/
function validateEmail(mail){
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)){
        return (true)
    }
    else{
        return(false)
    }
}
function setTargetAddress(){
    var tempaddress = document.getElementById("targetemail").value;
    if (validateEmail(mail) == true){
        targetaddress = tempaddress
    }
    else{
        targetaddress = ""
    }
};

function cubicSpline(x,y,ratio){

    var n=x.length-1;
    var h = new Float32Array(n);
    var newLength = y.length*ratio;
    for (var i=0; i<n; i++){
        h[i]=x[i+1]-x[i];
    };
    var al = new Float32Array(n-1);
    for (var i=1; i<n; i++){
        al[i]=3*((y[i+1]-y[i])/h[i] - (y[i]-y[i-1])/h[i-1]);
    };
    al[0]=0;
    var l = new Float32Array(n+1);
    var u = new Float32Array(n+1);
    var z = new Float32Array(n+1);
    l.fill(1);
    u.fill(0);
    z.fill(0);
    for (var i=1; i<n; i++){
        l[i] = 2*(x[i+1]-x[i-1]) - h[i-1]*u[i-1];
        u[i] = h[i]/l[i];
        z[i] = (al[i] - h[i-1]*z[i-1])/l[i];
    };
    var b = new Float32Array(n+1);
    var c = new Float32Array(n+1);
    var d = new Float32Array(n+1);
    l.fill(0);
    u.fill(0);
    z.fill(0);
    for (var i = n-1; i>=0; i--){
        c[i] = z[i] - u[i]*c[i+1];
        b[i] = (y[i+1]-y[i])/h[i] - h[i]*(c[i+1] + 2*c[i])/3;
        d[i] = (c[i+1]-c[i])/(3*h[i]);
    };
    var result = [y, b, c, d];
    var xs = new Float32Array(newLength);
    var ys = new Float32Array(newLength);
    var coi;
    for(var i =0; i<newLength; i++){
        xs[i]=i/ratio;
        coi=Math.floor(i/ratio);
        ys[i]=result[0][coi]+result[1][coi]*(xs[i]-coi)+result[2][coi]*(xs[i]-coi)**2+result[3][coi]*(xs[i]-coi)**3;
    };
    return ys;
};
//returns a new array with a given sample rate
function SRConverter(origArray,origSR,newSR){
    var ratio = newSR/origSR;
    var origLength = origArray.length;
    var x = new Float32Array(origArray.length);
    for (var i =0; i<origLength; i++){
        x[i]=i;
    };
    var y = origArray;
    var newArray = cubicSpline(x,y,ratio);
    return newArray;
};

function abortRead() {
    reader.abort();
};

function errorHandler(evt) {
    switch(evt.target.error.code) {
    case evt.target.error.NOT_FOUND_ERR:
        alert('File Not Found!');
        break;
    case evt.target.error.NOT_READABLE_ERR:
        alert('File is not readable');
        break;
    case evt.target.error.ABORT_ERR:
        break; // noop
    default:
        alert('An error occurred reading this file.');
    };
};
function updateProgress(fraction){
    win.setProgressBar(fraction)
}
/*
function updateProgress(evt) {
    // evt is an ProgressEvent.
    if (evt.lengthComputable) {
        var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
        // Increase the progress bar length.
        if (percentLoaded < 100) {
            progress.style.width = percentLoaded + '%';
            progress.textContent = percentLoaded + '%';
        };
    };
};
*/
/*
var tabulation=function(){
mainTable = table(mainBufferLeft, mainBufferRight, mainBufferSampleRate);
referenceObj = table(referenceBufferLeft, referenceBufferRight, referenceBufferSampleRate);
}
*/
var finalFrontier = new Promise(function(resolve,reject){ 
    console.log("started button function")
    resolve('done');
    reject('rejected')
})
var readButtonPressed = function(){
finalFrontier.then(function(val){ 
    //tabulation()
    document.getElementById('console').innerHTML=('initiating json data sending')
    var JSONdata = reconstruct(mainObj,referenceObj,44100);
    if(document.getElementById('targetemail')!==""){
        setTargetAddress();
        send_data_to_server(JSONdata,targetaddress);
    }
    else{
        alert('Please Enter Your Email Address')
    }
    //var wav = new WaveFile();
    //wav.fromScratch(2,44100,'32',[JSONdata.left,JSONdata.right])

    //fs.writeFileSync('electron.wav',wav.toBuffer())
    resolve('done');
    reject('rejected')
})}





/*
var handleReferenceFileSelect=function(evt){
console.log("something is happening");
mainFileSelect(evt).then(function(val){
    console.log(mainOnline);

});
};
*/
//var barkscale = [0,51,127,200,270,370,440,530,640,770,950,1200,1550,19500];

/*
var bins = 1024;
*/
var bins = barkscale.length;   
/*
function table(left, right, originalSampleRate){
    var sampleRate = 44100;
    console.log("in the table function")
    if (originalSampleRate==44100){
        var left = left;
        var right = right;
    }
    else{
        var left = SRConverter(left,originalSampleRate,44100);
        var right = SRConverter(right,originalSampleRate,44100);
    };
    var origLength = left.length;
    var mono = new Float32Array(origLength);
    var side = new Float32Array(origLength);
    var monoMatrix = new Array(barkscale.length);
    var sideMatrix = new Array(barkscale.length);
    var monoMeanMatrix= new Array (barkscale.length);
    var monoDeviationMatrix= new Array (barkscale.length);
    var sideMeanMatrix= new Array (barkscale.length);
    var sideDeviationMatrix= new Array (barkscale.length);
    var monoHPMatrix = new Array(barkscale.length);
    var sideHPMatrix = new Array(barkscale.length);
    var monoLPMatrix = new Array(barkscale.length);
    var sideLPMatrix = new Array(barkscale.length);


    function LP(freq,sr){
        this.buf0 = 0
        this.buf1 = 0
        this.buf2 = 0
        this.buf3 = 0
        this.buf4 = 0
        this.buf5 = 0
        this.buf6 = 0
        this.buf7 = 0
        this.cutoff=2*Math.sin(Math.PI*(freq/sr))
    }
    LP.prototype.process=function(sample){
        this.buf0 += this.cutoff * (sample - this.buf0)
        this.buf1 += this.cutoff * (this.buf0 - this.buf1)
        this.buf2 += this.cutoff * (this.buf1 - this.buf2)
        this.buf3 += this.cutoff * (this.buf2 - this.buf3)
        this.buf4 += this.cutoff * (this.buf3 - this.buf4)
        this.buf5 += this.cutoff * (this.buf4 - this.buf5)
        this.buf6 += this.cutoff * (this.buf5 - this.buf6)
        this.buf7 += this.cutoff * (this.buf6 - this.buf7)
        return this.buf1
    }
    LP.prototype.output=function(mode){
        if(mode =="6"){
            return this.buf0
        }
        else if(mode ="12"){
            return this.buf1
        }
        else if(mode ="24"){
            return this.buf3
        }
        else if(mode ="48"){
            return this.buf7
        }
    }
    function HP(freq,sr){
        this.buf0 = 0;
        this.buf1 = 0;
        this.buf2 = 0;
        this.buf3 = 0;
        this.buf4 = 0;
        this.buf5 = 0;
        this.buf6 = 0;
        this.buf7 = 0;
        this.cutoff=2*Math.sin(Math.PI*(freq/sr));
    }
    HP.prototype.process=function(sample){
        this.buf0 += this.cutoff * (sample - this.buf0)
        this.buf1 += this.cutoff * (this.buf0 - this.buf1)
        this.buf2 += this.cutoff * (this.buf1 - this.buf2)
        this.buf3 += this.cutoff * (this.buf2 - this.buf3)
        this.buf4 += this.cutoff * (this.buf3 - this.buf4)
        this.buf5 += this.cutoff * (this.buf4 - this.buf5)
        this.buf6 += this.cutoff * (this.buf5 - this.buf6)
        this.buf7 += this.cutoff * (this.buf6 - this.buf7)
        return (sample - this.buf1)
    }
    HP.prototype.output=function(mode){
        if(mode =="6"){
            return (sample - this.buf0)
        }
        else if(mode ="12"){
            return (sample - this.buf1)
        }
        else if(mode ="24"){
            return (sample - this.buf3)
        }
        else if(mode ="48"){
            return (sample - this.buf7)
        }
    }
    for (var i =0; i<barkscale.length; i++){
        monoMatrix[i]=new Float32Array(origLength)
        sideMatrix[i]=new Float32Array(origLength)
        monoHPMatrix[i]=new HP(barkscale[i],sampleRate)
        sideHPMatrix[i]=new HP(barkscale[i],sampleRate)
        monoLPMatrix[i]=new LP(barkscale[i],sampleRate)
        sideLPMatrix[i]=new LP(barkscale[i],sampleRate)
        monoMeanMatrix[i]=0.0
        sideMeanMatrix[i]=0.0
        monoDeviationMatrix[i]=0.0
        sideDeviationMatrix[i]=0.0
    }           


    // transform left/right to mono/side with zero padding

    for (var i =0; i<origLength; i++){
        document.getElementById('console').innerHTML=('ms split:' + i + '/'+origLength)
        mono[i] = (left[i]+right[i])/2;
        side[i] = left[i]-mono;
    };
    // collecting FFT means for mono and side per bin
    for (var i =0; i<barkscale.length; i++){
    if (i==0){
        for (var j = 0; j<origLength; j++){
            var tempMono =monoLPMatrix[i+1].process(mono[j])
            var tempSide =sideLPMatrix[i+1].process(side[j])
            monoMatrix[i][j]=tempMono
            sideMatrix[i][j]=tempSide
            monoMeanMatrix[i]+=Math.abs(tempMono)/origLength
            sideMeanMatrix[i]+=Math.abs(tempSide)/origLength
            document.getElementById('console').innerHTML='mean:' + i+'/'+barkscale.length + '-'+j+'/'+origLength;
        }
    }
    else if(i==barkscale.length-1){
        for (var j = 0; j<origLength; j++){
            var tempMono =monoHPMatrix[i].process(mono[j])
            var tempSide =sideHPMatrix[i].process(side[j])
            monoMatrix[i][j]=tempMono
            sideMatrix[i][j]=tempSide
            monoMeanMatrix[i]+=Math.abs(tempMono)/origLength
            sideMeanMatrix[i]+=Math.abs(tempSide)/origLength
            document.getElementById('console').innerHTML='mean:' + i+'/'+barkscale.length + '-'+j+'/'+origLength;
        }
    }
    else{
        for (var j = 0; j<origLength; j++){
            var tempMono = monoLPMatrix[i+1].process(monoHPMatrix[i].process(mono[j]))
            var tempSide = sideLPMatrix[i+1].process(sideHPMatrix[i].process(side[j]))
            monoMatrix[i][j]=tempMono
            sideMatrix[i][j]=tempSide
            monoMeanMatrix[i]+=Math.abs(tempMono)/origLength
            sideMeanMatrix[i]+=Math.abs(tempSide)/origLength
            document.getElementById('console').innerHTML='mean:' + i+'/'+barkscale.length + '-'+j+'/'+origLength;
        }
    }
    
    }
    for (var i =0; i<barkscale.length; i++){
        for (var j = 0; j<origLength; j++){
            monoDeviationMatrix[i] +=  (Math.abs(monoMatrix[i][j])-monoMeanMatrix[i])/origLength;
            sideDeviationMatrix[i] +=  (Math.abs(sideMatrix[i][j])-sideMeanMatrix[i])/origLength;
            document.getElementById('console').innerHTML='dev:' + i+'/'+barkscale.length + '-'+j+'/'+origLength; 
        }
    }
  

    
    var t ={
        origLength:origLength,
        mono:mono,
        side:side,
        monoMatrix:monoMatrix,
        sideMatrix:sideMatrix,
        monoMeanMatrix:monoMeanMatrix,
        monoDeviationMatrix:monoDeviationMatrix,
        sideMeanMatrix:sideMeanMatrix,
        sideDeviationMatrix:sideDeviationMatrix
    }
    return t;
    
};
*/   
function reconstruct(mainObj,referenceObj,desiredSampleRate){
    document.getElementById('console').innerHTML='reconstruct';
    
    
    function ratio(bins){
        this.mono=new Array(bins);
        this.side=new Array(bins);
    };
    console.log('referenceObj : '+referenceObj)
    console.log('mainObj : '+mainObj)
    var ratio = new ratio(bins);
    
    for (var i =0; i<bins; i++){
        document.getElementById('console').innerHTML=i+'/'+bins;
        ratio.mono[i]=referenceObj.monoDeviationMatrix[i]/mainObj.monoDeviationMatrix[i];
        ratio.side[i]=referenceObj.sideDeviationMatrix[i]/mainObj.sideDeviationMatrix[i];
    };
    function soundData(){
        this.left = new Array(mainObj.bufferLeftOnly.length);
        this.right = new Array(mainObj.bufferLeftOnly.length);
        this.left.fill(0);
        this.right.fill(0);
    };

    var data= new soundData;


    for (var j =0; j<mainObj.bufferLeftOnly.length; j++){
    var tempMono = 0;
    var tempSide = 0;
        for(var i = 0; i<bins; i++){
            if(mainObj.monoMatrix[i][j]>=0){
                tempMono += Math.floor((mainObj.monoMatrix[i][j]-mainObj.monoMeanMatrix[i])*ratio.mono[i]+referenceObj.monoMeanMatrix[i])
                if(mainObj.sideMatrix[i][j]>=0){
                    tempSide += Math.floor((mainObj.sideMatrix[i][j]-mainObj.sideMeanMatrix[i])*ratio.side[i]+referenceObj.sideMeanMatrix[i])
                }
                else if(mainObj.sideMatrix[i][j]<0){
                    tempSide += Math.floor((mainObj.sideMatrix[i][j]+mainObj.sideMeanMatrix[i])*ratio.side[i]-referenceObj.sideMeanMatrix[i])
                }  
            }
            else if(mainObj.monoMatrix[i][j]<0){
                tempMono += Math.floor((mainObj.monoMatrix[i][j]+mainObj.monoMeanMatrix[i])*ratio.mono[i]-referenceObj.monoMeanMatrix[i])
                if(mainObj.sideMatrix[i][j]>=0){
                    tempSide += Math.floor((mainObj.sideMatrix[i][j]-mainObj.sideMeanMatrix[i])*ratio.side[i]+referenceObj.sideMeanMatrix[i])
                }
                else if(mainObj.sideMatrix[i][j]<0){
                    tempSide += Math.floor((mainObj.sideMatrix[i][j]+mainObj.sideMeanMatrix[i])*ratio.side[i]-referenceObj.sideMeanMatrix[i])
                }  
            } 
            document.getElementById('console').innerHTML=j+'/'+mainObj.origLength+'-'+i+'/'+bins;   
        }
    data.left[j]=tempMono+tempSide
    data.right[j]=tempMono-tempSide
    }
    var mainWav = new WaveFile(fs.readFileSync(mainObj.filePath.path))
    var refWav = new WaveFile(fs.readFileSync(refObj.filePath.path))

    var newLeft = SRConverter(data.left,mainWav.fmt.sampleRate(),desiredSampleRate);
    var newRight = SRConverter(data.right,mainWav.fmt.sampleRate(),desiredSampleRate);

    var forNumpy = new Array(origLength);
    for (var i =0; i<origLength; i++){
        arrayForNumpy[i]=[newLeft[i],newRight[i]];
    };
    mastered ={
        float:true,
        symmetric:true,
        bitDepth:32,
        sampleRate:desiredSampleRate,
        channelData:[
            newLeft,
            newRight
        ],
        forNumpy:arrayForNumpy,
        sendto:targetaddress
    };
    var masteredJSON = JSON.stringify(mastered);

    /*
    localStorage.setItem('mastered.json',JSON.stringify(mastered))
    */
    return masteredJSON;
    

};
function send_data_to_server(data){
    document.getElementById('console').innerHTML='sending data to email address';
    var request = new XMLHttpRequest();

    "url needs to be updated once flask is deployed"

    request.open('POST','bernardahn.pythonanywhere.com',true);
    request.setRequestHeader("content-type","application/json");
    request.send(data);
    document.getElementById('console').innerHTML='done! please check your email';
};
