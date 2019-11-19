var {ipcRenderer,remote,app} = require('electron')
var dialog = remote.dialog
var fs = require('fs')
var WaveFile =require('wavefile')
var path = require('path')
var spawn=require('child_process').spawn
const stringifyObject = require('stringify-object');

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
var wav = require('wav')


//consoleContainer.style.display='none'
targetEmail.style.display = 'none'

cancelButton.style.display='none'
var fileList = new Array;
var saveDirectory = "";
//originalTrackButton.style.display = 'none'
readButton.style.display='none'
/*
btw 
var filename = path.parse(fullpath).base;
*/
function cubicSpline(x,y,ratio){

    var n=x.length-1;
    //var h = new Float32Array(n);
    var h = new Array(n)
    // console.log(ratio)
    // console.log(y.length)
    var newLength = y.length*ratio;
    for (var i=0; i<n; i++){
        h[i]=x[i+1]-x[i];
    };

    //var al = new Float32Array(n-1);
    var al = new Array(n-1);
    for (var i=1; i<n; i++){
        al[i]=3*((y[i+1]-y[i])/h[i] - (y[i]-y[i-1])/h[i-1]);
    };
    al[0]=0;
    // var l = new Float32Array(n+1);
    // var u = new Float32Array(n+1);
    // var z = new Float32Array(n+1);
    var l = new Array(n+1);
    var u = new Array(n+1);
    var z = new Array(n+1);
    l.fill(1);
    u.fill(0);
    z.fill(0);
    for (var i=1; i<n; i++){
        l[i] = 2*(x[i+1]-x[i-1]) - h[i-1]*u[i-1];
        u[i] = h[i]/l[i];
        z[i] = (al[i] - h[i-1]*z[i-1])/l[i];
    };
    // var b = new Float32Array(n+1);
    // var c = new Float32Array(n+1);
    // var d = new Float32Array(n+1);
    var b = new Array(n+1);
    var c = new Array(n+1);
    var d = new Array(n+1);
    l.fill(0);
    u.fill(0);
    z.fill(0);
    for (var i = n-1; i>=0; i--){
        c[i] = z[i] - u[i]*c[i+1];
        b[i] = (y[i+1]-y[i])/h[i] - h[i]*(c[i+1] + 2*c[i])/3;
        d[i] = (c[i+1]-c[i])/(3*h[i]);
    };
    var result = [y, b, c, d];
    // var xs = new Float32Array(newLength);
    // var ys = new Float32Array(newLength);
    var xs = new Array(newLength);
    var ys = new Array(newLength);
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
    // console.log(newSR)
    // console.log(origSR)
    // console.log(ratio)
    var origLength = origArray.length;
    //var x = new Float32Array(origArray.length);
    var x = new Array(origArray.length)
    for (var i =0; i<origLength; i++){
        x[i]=i;
    };
    var y = origArray;
    var newArray = cubicSpline(x,y,ratio);
    return newArray;
};
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
    track.prototype.bufferSampleLength=null;
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
        this.mono = SRConverter(this.bufferMono,this.bufferSampleRate,44100)
        this.leftOnly=SRConverter(this.bufferLeftOnly,this.bufferSampleRate,44100)
        this.sampleLength=this.mono.length
        for (var i =0; i<barkscale.length+1; i++){
            this.monoMatrix[i] =new Array(this.mono.length);
            this.sideMatrix[i] = new Array(this.mono.length);
            this.monoMeanArray[i]=0.0
            this.sideMeanArray[i]=0.0
            this.monoDeviationArray[i]=0.0
            this.sideDeviationArray[i]=0.0
            if(i<barkscale.length){
                console.log('filterarray')
                this.monoHPArray[i]=new HP(barkscale[i],44100)
                this.sideHPArray[i]=new HP(barkscale[i],44100)
                this.monoLPArray[i]=new LP(barkscale[i],44100)
                this.sideLPArray[i]=new LP(barkscale[i],44100)
            }
        }
    }
    track.prototype.enterTheMatrix=function(){
        this.newMatrix()
        //console.log(this)
        for (var i =0; i<barkscale.length+1; i++){
            if (i==0){
                for (var j = 0; j<this.sampleLength; j++){
                    this.monoMean+=Math.abs(this.mono[j])/this.sampleLength
                    this.sideMean+=Math.abs(this.leftOnly[j])/this.sampleLength
                    var monoLP = this.monoLPArray[i]
                    var sideLP = this.sideLPArray[i]
                    var tempMono =monoLP.process(this.mono[j])
                    var tempSide =sideLP.process(this.leftOnly[j])
                    this.monoMatrix[i][j]=tempMono
                    this.sideMatrix[i][j]=tempSide
                    this.monoMeanArray[i]+=Math.abs(tempMono)/this.sampleLength
                    this.sideMeanArray[i]+=Math.abs(tempSide)/this.sampleLength
                }
            }
            else if(i==barkscale.length){
                for (var j = 0; j<this.sampleLength; j++){
                    var monoHP = this.monoHPArray[i-1]
                    var sideHP = this.sideHPArray[i-1]
                    var tempMono =monoHP.process(this.mono[j])
                    var tempSide =sideHP.process(this.leftOnly[j])
                    this.monoMatrix[i][j]=tempMono
                    this.sideMatrix[i][j]=tempSide
                    this.monoMeanArray[i]+=Math.abs(tempMono)/this.sampleLength
                    this.sideMeanArray[i]+=Math.abs(tempSide)/this.sampleLength
                }
            }
            else{
                for (var j = 0; j<this.sampleLength; j++){
                    var monoHP = this.monoHPArray[i-1]
                    var sideHP = this.sideHPArray[i-1]
                    var monoLP = this.monoLPArray[i]
                    var sideLP = this.sideLPArray[i]
                    //console.log(this.mono[j])

                    var tempMono = monoLP.process(monoHP.process(this.mono[j]))
                    var tempSide = sideLP.process(sideHP.process(this.leftOnly[j]))
                    this.monoMatrix[i][j]=tempMono
                    this.sideMatrix[i][j]=tempSide
                    this.monoMeanArray[i]+=Math.abs(tempMono)/this.sampleLength
                    this.sideMeanArray[i]+=Math.abs(tempSide)/this.sampleLength
                    this.monoVariance += Math.abs(Math.abs(this.mono[i])-this.monoMean)/this.sampleLength
                    this.sideVariance += Math.abs(Math.abs(this.leftOnly[i])-this.sideMean)/this.sampleLength
                    //console.log(tempMono)
                }
            }
            
            
        }
            for (var i =0; i<barkscale.length; i++){
                for (var j = 0; j<this.sampleLength; j++){
                    this.monoDeviationArray[i] +=  (Math.abs(this.monoMatrix[i][j])-this.monoMeanArray[i])/this.sampleLength;
                    this.sideDeviationArray[i] +=  (Math.abs(this.sideMatrix[i][j])-this.sideMeanArray[i])/this.sampleLength;
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

function fileSelect(evt,obj){
        var files= evt.target.files;
        console.log(files[0].path)
        var filepath =files[0].path
        //originalFilePath= files[0];
        obj.filePath=filepath;        
        reader = new FileReader();
        if(obj.filePath!==null){
            var wav=new WaveFile(fs.readFileSync(filepath))
            //console.log(wav)
            wav.toBitDepth(32)
            //console.log(wav)
            obj.bufferLeft = []
            obj.bufferRight = []
            obj.bufferMono=[]
            obj.leftOnly=[]
            obj.mono=[]
            obj.sampleLength=wav.data.samples.length/8
            //console.log(wav.fmt.sampleRate)
            obj.sampleRate=wav.fmt.sampleRate
            obj.bufferSampleRate=wav.fmt.sampleRate
            for (var i=0; i<obj.sampleLength; i++){
                // obj.bufferLeft.push(eightToThreeTwo(wav.data.samples,8*i)/2147483647)
                // obj.bufferRight.push(eightToThreeTwo(wav.data.samples,8*i+4)/2147483647)
                obj.bufferLeft.push(eightToThreeTwo(wav.data.samples,8*i))
                obj.bufferRight.push(eightToThreeTwo(wav.data.samples,8*i+4))
                // var mono = ((eightToThreeTwo(wav.data.samples,8*i)/2147483647)+eightToThreeTwo(wav.data.samples,8*i+4)/2147483647)/2.0
                // obj.bufferMono.push(mono)
                // var leftOnly=eightToThreeTwo(wav.data.samples,8*i)/2147483647-(((eightToThreeTwo(wav.data.samples,8*i)/2147483647)+eightToThreeTwo(wav.data.samples,8*i+4)/2147483647)/2.0)
                // obj.bufferLeftOnly.push(leftOnly)
                // var mono = Math.floor(((eightToThreeTwo(wav.data.samples,8*i)/2147483647)+eightToThreeTwo(wav.data.samples,8*i+4))/2)
                // obj.bufferMono.push(mono)
               
                //obj.monoMean+=Math.abs(mono)/(obj.sampleLength)
                //obj.sideMean+=Math.abs(leftOnly)/(obj.sampleLength)
            };
            for(var i = 0; i<obj.sampleLength; i++){
                var mono = Math.floor((obj.bufferLeft[i]+obj.bufferRight[i])/2)
                //console.log(mono)
                obj.mono.push(mono)
                obj.bufferMono.push(mono)
                var leftOnly=obj.bufferLeft[i]-mono
                if(typeof(leftOnly)!='number'){
                    console.log(leftOnly)
                }
                obj.bufferLeftOnly.push(leftOnly)
                obj.leftOnly.push(leftOnly)
                //console.log(obj.bufferLeftOnly)
            }
            
            //wav.toBuffer()
            // reader.readAsArrayBuffer(files[0]);
            // reader.onerror = errorHandler;
            // reader.onabort = function(e) {
            // alert('File read cancelled');
            // };
            //     reader.onload = function(e) {
            //         console.log('entered reader')
            //         obj.arrayBuffer = this.result;               
            //         obj.eight = new Int8Array(obj.arrayBuffer)
                    
                    //obj.onesix = new Int16Array(obj.eight.length/2)
                    // for (var i = 0; i<obj.eight.length/2; i++){
                    //     obj.onesix[i]=((obj.eight[2*i])+(obj.eight[2*i+1]<<8))
                    // }
                    // obj.twofour = new Array(obj.eight.length/2)
                    // {
                    //     obj.twofour[i]=((obj.eight[3*i])+(obj.eight[3*i+1]<<8)+(obj.eight[3*i+2]<<8<<8))
                    // }
                    
                    //obj.bufferSampleRate = obj.eight[24]+((256+obj.eight[25])<<8)
                    //obj.bufferSampleRate = wav.fmt.sampleRate;
                    //obj.channels = eightToOneSix(obj.eight,22)
                    //obj.bitrate = eightToThreeTwo(obj.eight,28)/obj.bufferSampleRate/obj.channels*8
                    //obj.maxNumber = 0;
                    //obj.subchunk = eightToThreeTwo(obj.eight,20)
                    //obj.bitdepth = obj.bitrate/8;
                    //obj.bufferSampleLength = (eightToThreeTwo(obj.eight,4)-36)/obj.bitdepth/obj.channels
                    //obj.bitsPerSample = eightToOneSix(obj.eight, 34)/obj.channels

                    //var tempBuffer =new Int32Array(obj.sampleLength*4)

                    
                    // if(obj.bitrate==16 && obj.channels==2){
                    //     for (var i=0; i<Math.ceil(obj.bufferSampleLength); i++){
                    //         obj.left = eightToOneSix(obj.eight,44+4*i)
                    //         obj.right = eightToOneSix(obj.eight,44+4*i+2)
                    //         obj.mono = (obj.left+obj.right)/(2)
                    //         obj.leftOnly = obj.left-obj.mono
                    //         obj.absLeft[i] = Math.abs(obj.left)
                    //         obj.absRight[i] = Math.abs(obj.right)
                    //         if(obj.maxNumber<obj.absLeft||obj.maxNumber<obj.absRight){
                    //             (obj.left>obj.right) ? obj.maxNumber = obj.absLeft : obj.maxNumber = obj.absRight;
                    //         }
                    //         obj.bufferLeft.push(obj.left)
                    //         obj.bufferRight.push(obj.right)
                    //         obj.bufferMono.push(obj.mono)
                    //         obj.bufferLeftOnly.push(obj.leftOnly)
                    //         /*
                    //         obj.monoMean+=Math.abs(obj.mono)/obj.bufferSampleLength
                    //         obj.sideMean+=Math.abs(obj.leftOnly)/obj.bufferSampleLength
                    //         */
                    //     };
                    // }
                    // else if (obj.bitrate==16 && obj.channels ==1){
                        
                    //     for (var i=0; i<Math.ceil(obj.bufferSampleLength); i++){
                    //         obj.left = (eightToOneSix(obj.eight,44+2*i))
                    //         obj.absLeft = Math.abs(obj.left)
                    //         if(obj.maxNumber<obj.absLeft){
                    //             obj.maxNumber = obj.absLeft;
                    //         }
                    //         obj.bufferLeft.push(obj.left)
                    //         obj.bufferRight.push(obj.left)
                    //         obj.bufferMono.push(obj.left)
                    //         obj.bufferLeftOnly.push(0)
                    //         /*
                    //         obj.monoMean+=Math.abs(obj.left)/obj.bufferSampleLength
                    //         */
                    //     };
                    // };
                    // if(obj.bitrate==24 && obj.channels ==2){
                    //     for (var i=0; i<obj.bufferSampleLength; i++){
                    //         obj.left = (eightToTwoFour(obj.eight,44+6*i))
                    //         obj.right = (eightToTwoFour(obj.eight,44+6*i+3))
                    //         obj.absLeft = Math.abs(obj.left)
                    //         obj.absRight = Math.abs(obj.right)
                    //         obj.mono = (obj.left+obj.right)/(2)
                    //         obj.leftOnly = obj.left-obj.mono
                    //         if(obj.maxNumber<obj.absLeft||obj.maxNumber<obj.absRight){
                    //             (obj.absLeft>obj.absRight) ? obj.maxNumber = obj.absLeft : obj.maxNumber = obj.absRight;
                    //         }
                    //         obj.bufferLeft.push(obj.left)
                    //         obj.bufferRight.push(obj.right)
                    //         obj.bufferMono.push(obj.mono)
                    //         obj.bufferLeftOnly.push(obj.leftOnly)
                    //         /*
                    //         obj.monoMean+=Math.abs(obj.mono)/obj.bufferSampleLength
                    //         obj.sideMean+=Math.abs(obj.leftOnly)/obj.bufferSampleLength
                    //         */
                    //     }
                    // }
                    // else if(obj.bitrate==24 && obj.channels ==1){
                    //     for (var i=0; i<obj.bufferSampleLength; i++){
                    //         obj.left = (eightToTwoFour(obj.eight,44+3*i))
                    //         obj.absLeft = Math.abs(obj.left)
                    //         if(obj.maxNumber<obj.absLeft){
                    //             obj.maxNumber = obj.absLeft;
                    //         }
                    //         obj.bufferLeft.push(obj.left)
                    //         obj.bufferRight.push(obj.left)
                    //         obj.bufferMono.push(obj.left)
                    //         obj.bufferLeftOnly.push(0)
                    //         /*
                    //         obj.monoMean+=Math.abs(obj.left)/obj.bufferSampleLength
                    //         */
                    //     }
                    // }
//                     if(obj.bitrate==32 && obj.channels==2){
//                         for (var i=0; i<obj.bufferSampleLength; i++){
//                             obj.left = eightToThreeTwo(obj.eight,44+8*i)
//                             obj.right = eightToThreeTwo(obj.eight,44+8*i+4)
//                             obj.absLeft = Math.abs(obj.left)
//                             obj.absRight = Math.abs(obj.right)
//                             obj.mono = (obj.left+obj.right)/(2)
//                             obj.leftOnly = obj.left-obj.mono
//                             if(obj.maxNumber<obj.absLeft||obj.maxNumber<obj.absRight){
//                                 (obj.absLeft>obj.absRight) ? obj.maxNumber = obj.absLeft : obj.maxNumber = obj.absRight;
//                             }
//                             obj.bufferLeft.push(obj.left)
//                             obj.bufferRight.push(obj.right)
//                             obj.bufferMono.push(obj.mono)
//                             obj.bufferLeftOnly.push(obj.leftOnly)
//                             /*
//                             obj.monoMean+=Math.abs(obj.mono)/obj.bufferSampleLength
//                             obj.sideMean+=Math.abs(leftOnly)/obj.bufferSampleLength
//                             */
//                         };
//                     }
//                     else if (obj.bitrate==32 && obj.channels ==1){
//                         for (var i=0; i<obj.bufferSampleLength; i++){
//                             obj.left = eightToThreeTwo(obj.eight,44+4*i)
//                             obj.absLeft = Math.abs(obj.left)
//                             if(obj.maxNumber<obj.absLeft){
//                                 obj.maxNumber = obj.absLeft;
//                             }
//                             obj.bufferLeft.push(obj.left)
//                             obj.bufferRight.push(obj.left)
//                             obj.bufferMono.push(obj.left)
//                             obj.bufferLeftOnly.push(0)
//                             /*
//                             obj.monoMean+=Math.abs(obj.left)/obj.bufferSampleLength
//                             */
//                         };
//                     };
            
//                     obj.monoMean = obj.monoMean/obj.maxNumber
//                     obj.sideMean = obj.sideMean/obj.maxNumber
//                     //console.log(obj.monoMean/obj.maxNumber)
//                     for (var i=0; i<obj.bufferLeft.length; i++){
                        
//                         obj.bufferLeft[i]=(obj.bufferLeft[i])/obj.maxNumber;
//                         obj.bufferRight[i]=(obj.bufferRight[i])/obj.maxNumber;
//                         obj.bufferMono[i]=(obj.bufferMono[i]/obj.maxNumber);
//                         obj.bufferLeftOnly[i]=obj.bufferLeftOnly[i]/obj.maxNumber;
                        
//                 /*
//                         obj.monoVariance += Math.abs(Math.abs(obj.bufferMono[i])-obj.monoMean)/obj.bufferSampleLength
//                         obj.sideVariance += Math.abs(Math.abs(obj.bufferLeftOnly[i])-obj.sideMean)/obj.bufferSampleLength
// */
//                     }; 
                    
//                     /*
//                     for(var i in obj){
//                         if(obj[i]==null){
//                             delete obj[i]
//                         }
//                         else if (obj[i][0]==undefined){
//                             delete obj[i]
//                         }
//                     }
//                     */
                  
                    
                   obj.online = true;    
//             }
       }
        
};

var referenceTrackSelect = function(evt){
    document.getElementById('referenceFile').addEventListener('change',readFile,false);
    function readFile(evt,referencObj){
        fileSelect(evt,referenceObj)
        document.getElementById('console').innerHTML=path.basename(referenceObj.filePath)+ ' has been selected.'
        if(mainObj.online==true){
            referenceObj.enterTheMatrix(barkscale)
            mainObj.enterTheMatrix(barkscale)
            originalTrackButton.style.display='none'
            referenceTrackButton.style.display='none'
            readButton.style.display='block'
            //reconstruct()
        }
    }
};
function originalTrackSelect(evt){
    document.getElementById('originalFile').addEventListener('change',readFile,false);
    function readFile(evt){
        fileSelect(evt,mainObj)
        document.getElementById('console').innerHTML=path.basename(mainObj.filePath)+ ' has been selected.'
        if(referenceObj.online==true){
            mainObj.enterTheMatrix(barkscale)
            referenceObj.enterTheMatrix(barkscale)
            originalTrackButton.style.display='none'
            referenceTrackButton.style.display='none'
            readButton.style.display='block'
            //reconstruct()
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
/*
var finalFrontier = new Promise(function(resolve,reject){ 
    console.log("started button function")
    resolve('done');
    reject('rejected')
})
*/
function reconstruct(mainObj,referenceObj,desiredSampleRate){
    document.getElementById('console').innerHTML='reconstruct';
    function ratio(bins){
        this.mono=new Array(bins);
        this.side=new Array(bins);
    };
    console.log('referenceObj : '+stringifyObject(referenceObj))
    console.log('mainObj : '+stringifyObject(mainObj))
    var ratio = new ratio(barkscale.length);
    for (var i =0; i<barkscale.length; i++){
        document.getElementById('console').innerHTML=i+'/'+barkscale.length;
        ratio.mono[i]=referenceObj.monoDeviationArray[i]/mainObj.monoDeviationArray[i];
        ratio.side[i]=referenceObj.sideDeviationArray[i]/mainObj.sideDeviationArray[i];
    };
    console.log('ratio matrix : ',stringifyObject(ratio))
    function soundData(){
        this.left = new Array(mainObj.leftOnly.length);
        this.right = new Array(mainObj.leftOnly.length);
        this.left.fill(0);
        this.right.fill(0);
        this.interlaced=new Array();
    };
    var data= new soundData;
    for (var j =0; j<mainObj.bufferLeftOnly.length; j++){
    var tempMono = 0;
    var tempSide = 0;
        for(var i = 0; i<barkscale.length; i++){
            if(mainObj.monoMatrix[i][j]>=0){
                tempMono += Math.floor((mainObj.monoMatrix[i][j]-mainObj.monoMeanArray[i])*ratio.mono[i]+referenceObj.monoMeanArray[i])
                if(mainObj.sideMatrix[i][j]>=0){
                    tempSide += Math.floor((mainObj.sideMatrix[i][j]-mainObj.sideMeanArray[i])*ratio.side[i]+referenceObj.sideMeanArray[i])
                }
                else if(mainObj.sideMatrix[i][j]<0){
                    tempSide += Math.floor((mainObj.sideMatrix[i][j]+mainObj.sideMeanArray[i])*ratio.side[i]-referenceObj.sideMeanArray[i])
                }  
            }
            else if(mainObj.monoMatrix[i][j]<0){
                tempMono += Math.floor((mainObj.monoMatrix[i][j]+mainObj.monoMeanArray[i])*ratio.mono[i]-referenceObj.monoMeanArray[i])
                if(mainObj.sideMatrix[i][j]>=0){
                    tempSide += Math.floor((mainObj.sideMatrix[i][j]-mainObj.sideMeanArray[i])*ratio.side[i]+referenceObj.sideMeanArray[i])
                }
                else if(mainObj.sideMatrix[i][j]<0){
                    tempSide += Math.floor((mainObj.sideMatrix[i][j]+mainObj.sideMeanArray[i])*ratio.side[i]-referenceObj.sideMeanArray[i])
                }  
            } 
            document.getElementById('console').innerHTML=j+'/'+mainObj.bufferLeftOnly.length+'-'+i+'/'+barkscale.length;   
        }
    data.left[j]=tempMono+tempSide
    data.right[j]=tempMono-tempSide
    }
    /*
    var mainWav = new WaveFile(fs.readFileSync(mainObj.filePath.path))
    var refWav = new WaveFile(fs.readFileSync(refObj.filePath.path))
    */
    var newLeft = SRConverter(data.left,44100,desiredSampleRate);
    var newRight = SRConverter(data.right,44100,desiredSampleRate);
    
    for(var i=0; i<newLeft.length; i++){
        //console.log(newLeft[i])
        data.interlaced.push(newLeft[i])
        data.interlaced.push(newRight[i])
    }
    var fullPathDirectory=path.dirname(mainObj.filePath)+'/mastered_files/'
  
        try {
            fs.mkdirSync(fullPathDirectory)
          } catch (err) {
            if (err.code !== 'EEXIST')  {
                document.getElementById('console').innerHTML=err
            }
          }
    
    var fullPathName=fullPathDirectory+path.basename(mainObj.filePath)
    var wav = new WaveFile()
    wav.fromScratch(2,desiredSampleRate,'32f',[data.interlaced])
    console.log(fullPathName)
    fs.writeFileSync(fullPathName,wav.toBuffer())
    //document.getElementById('console').innerHTML='check the file dude'
    document.getElementById('console').innerHTML='created file : '+fullPathName
    var arrayForNumpy = new Array(newLeft.length);
    for (var i =0; i<newLeft.length; i++){
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

var readButtonPressed = function(){
    //tabulation()
    //var desiredSampleRate = 48000
    var desiredSampleRate = 44100
    document.getElementById('console').innerHTML=('initiating json data sending')
    var JSONdata = reconstruct(mainObj,referenceObj,desiredSampleRate);
    /*
    if(document.getElementById('targetemail')!==""){
        setTargetAddress();
        send_data_to_server(JSONdata,targetaddress);
    }
    else{
        alert('Please Enter Your Email Address')
    }
    */

    //fs.writeFileSync('electron.wav',wav.toBuffer())
    /*
    resolve('done');
    reject('rejected')
    */
}






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

function send_data_to_server(data){
    document.getElementById('console').innerHTML='sending data to email address';
    var request = new XMLHttpRequest();

    "url needs to be updated once flask is deployed"

    request.open('POST','bernardahn.pythonanywhere.com',true);
    request.setRequestHeader("content-type","application/json");
    request.send(data);
    document.getElementById('console').innerHTML='done! please check your email';
};
