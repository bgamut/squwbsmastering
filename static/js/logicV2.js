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
//var wav = require('wav')
var pcm = require('pcm')
var wav = require('node-wav')
remote.getCurrentWindow().toggleDevTools()
referenceTrackButton.style.display='none'

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
// a snippet of babylonsisters

const pad=(n, width, padnumber)=>{
    padnumber = padnumber || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(padnumber) + n;
  }

var referenceStats={
    monoMeanArray:[0.042045691939235255, 0.30350496273493044, 0.11162788789494214, 0.008448073265478086],
    monoDeviationArray:[0.05534535221208015, 0.3960832520494717, 0.14692152044358975, 0],
    sideMeanArray:[0.0024129038023947683, 0.029907691106377872, 0.011327437907067852, 0.0008545722599771934],
    sideDeviationArray:[0.0031832037448466218, 0.039556932569829624, 0.015011548049436968, 0],
    online:true
}


function LP(freq,sr){
    this.buf0 = 0
    this.buf1 = 0
    this.buf2 = 0
    this.buf3 = 0
    this.buf4 = 0
    this.buf5 = 0
    this.buf6 = 0
    this.buf7 = 0
    this.mode = 12
    this.cutoff=2*Math.sin(Math.PI*(freq/sr))
  }
  LP.prototype.setMode=function(mode){
    this.mode=mode
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
      if(this.mode ==6){
        return this.buf0
      }
      else if(this.mode =12){
          console.log(this.buf1)
          return this.buf1
      }
      else if(this.mode =24){
          return this.buf3
      }
      else if(this.mode =48){
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
    this.mode =12
  }
  HP.prototype.setMode=function(mode){
    this.mode=mode
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
    if(this.mode ==6){
      return (sample - this.buf0)
    }
    else if(this.mode =12){
        var returnVal=sample - this.buf1
        //console.log('hp:',sample)
        return (returnVal)
    }
    else if(this.mode =24){
        return (sample - this.buf3)
    }
    else if(this.mode =48){
        return (sample - this.buf7)
    }
  }
  function BAND(lowFreq,highFreq,sr){
    this.hp=new HP(lowFreq,sr)
    this.lp=new LP(highFreq,sr)
  }
  BAND.prototype.setMode=function(mode){
    this.lp.setMode(mode)
    this.hp.setMode(mode)
  }
  BAND.prototype.process=function(sample){
    var returnVal=this.lp.process(this.hp.process(sample))
    //console.log('band :',returnVal)
    return (returnVal)
  }
  var barkscale = [175,2750,6600]
  function FOURBAND(sr){
    var barkscale = [175,2750,6600]
    this.high = new HP(barkscale[barkscale.length-1],sr)
    this.mid = new BAND(barkscale[barkscale.length-2],[barkscale.length-1],sr)
    this.midlow = new BAND(barkscale[barkscale.length-3],[barkscale.length-2],sr)
    this.low = new LP(barkscale[barkscale.length-3],sr)
    this.mode=12
  }
  FOURBAND.prototype.setMode=function(mode){
    this.high.setMode(mode)
    this.mid.setMode(mode)
    this.midlow.setMode(mode)
    this.low.setMode(mode)
    this.mode=mode
  }
  FOURBAND.prototype.process=function(sample){
    
    return [this.low.process(sample),this.midlow.process(sample),this.mid.process(sample),this.high.process(sample)]
  }
  
  
  function MATCH(){
    this.userMean=0
    this.userDev=0
    this.refMean=0
    this.refDev=0
    this.buffer=[0,0,0,0]
  }
  MATCH.prototype.setUserMean=function(userMean){
    this.userMean=userMean
  }
  MATCH.prototype.setUserDev=function(userDev){
    this.userDev=userDev
  }
  MATCH.prototype.setRefMean=function(RefMean){
    this.RefMean=RefMean
  }
  MATCH.prototype.setRefDev=function(RefDev){
    this.RefDev=RefDev
  }
  MATCH.prototype.process=function(sample){
    this.buffer.slice(0,1)
    if(sample>0){
        if(this.userDev==0){
            this.buffer.push(
                sample-this.userMean+this.refMean
            )
        }
        else{
            this.buffer.push(
                ((sample-this.userMean)*this.refDev/this.userDev)+this.userDev
              )
        }
      
    }
    else if (sample<0){
        if(this.userDev==0){
            this.buffer.push(
                sample+this.userMean-this.refMean
            )
        }
        else{
            this.buffer.push(
                ((sample+this.userMean)*this.refDev/this.userDev)-this.refMean
            )
        }
    }
    else if(sample==0){
        this.buffer.push(0)
    }
    var average = 0;
    for (var i =0; i<this.buffer.length; i++){
      average+=this.buffer[i]/this.buffer.length
    }
    return average
  }
  function MATCHER(){
    this.high=new MATCH()
    this.mid=new MATCH()
    this.midlow=new MATCH()
    this.low=new MATCH()
  }
  MATCHER.prototype.setHigh=function(userMean,userDev,refMean,refDev){
    this.high.setUserMean(userMean)
    this.high.setUserDev(userDev)
    this.high.setRefMean(refMean)
    this.high.setRefDev(refDev)
  }
  MATCHER.prototype.setMid=function(userMean,userDev,refMean,refDev){
    this.mid.setUserMean(userMean)
    this.mid.setUserDev(userDev)
    this.mid.setRefMean(refMean)
    this.mid.setRefDev(refDev)
  }
  MATCHER.prototype.setMidLow=function(userMean,userDev,refMean,refDev){
    this.midlow.setUserMean(userMean)
    this.midlow.setUserDev(userDev)
    this.midlow.setRefMean(refMean)
    this.midlow.setRefDev(refDev)
  }
  MATCHER.prototype.setLow=function(userMean,userDev,refMean,refDev){
    this.low.setUserMean(userMean)
    this.low.setUserDev(userDev)
    this.low.setRefMean(refMean)
    this.low.setRefDev(refDev)
  }
  MATCHER.prototype.setRef=function(refObj){
    this.setLow(this.low.userMean,this.low.userDev,refObj.meanArray[0],refObj.devArray[0])
    this.setMidLow(this.midlow.userMean,this.midlow.userDev,refObj.meanArray[1],refObj.devArray[1])
    this.setMid(this.mid.userMean,this.mid.userDev,refObj.meanArray[2],refObj.devArray[2])
    this.setHigh(this.high.userMean,this.high.userDev,refObj.meanArray[3],refObj.devArray[3])
  }
  MATCHER.prototype.setUser=function(userObj){
    this.setLow(userObj.meanArray[0],userObj.devArray[0],this.low.refMean,this.low.refDev)
    this.setMidLow(userObj.meanArray[1],userObj.devArray[1],this.midlow.refMean,this.midlow.refDev)
    this.setMid(userObj.meanArray[2],userObj.devArray[2],this.mid.refMean,this.mid.refDev)
    this.setHigh(userObj.meanArray[3],userObj.devArray[3],this.high.refMean,this.high.refDev)
  }
  MATCHER.prototype.process=function([low,midlow,mid,high]){
    return([this.low.process(low),this.midlow.process(midlow),this.mid.process(mid),this.high.process(high)])
  }
  
  function ANALYZER(){
    this.mean=0
    this.dev=0
    this.max=0
  }
  ANALYZER.prototype.process=function(array){
    for(var i = 0; i< array.length; i++){
      var val = Math.abs(array[i])
      this.mean+=val/array.length
      if(val>this.max){
        this.max=val
      }
    }
    for(var i = 0; i< array.length; i++){
      var val = Math.abs(array[i])
      this.dev+=Math.abs(val-this.mean)/array.length
      //console.log('pushing to analyzer buffer : ', pad(i/array.length,6,0))
      document.getElementById('console').innerHTML='pushing to analyzer buffer : ', pad(i/array.length,6,0)
    }
    return({mean:this.mean,dev:this.dev})
  }
  function STATS(SR){
    this.mfb= new FOURBAND(SR)
    this.sfb= new FOURBAND(SR)
    this.mh= new ANALYZER
    this.mm= new ANALYZER
    this.mml= new ANALYZER
    this.ml= new ANALYZER
    this.sh= new ANALYZER
    this.sm= new ANALYZER
    this.sml= new ANALYZER
    this.sl= new ANALYZER
    
  }
  STATS.prototype.process=function(mid,side){
    // FOURBAND.prototype.process=function(sample){
    //   return [this.low.process(sample),this.midlow.process(sample),this.mid.process(sample),this.high.process(sample)]
    // }
    var mha=[]
    var mma=[]
    var mmla=[]
    var mla=[]
    var sha=[]
    var sma=[]
    var smla=[]
    var sla=[]
    for (var i =0; i<mid.length; i++){
      //console.log('pushing to mid/side buffer : ', pad(i/mid.length,6,0))
      //document.getElementById('console').innerHTML='pushing to mid/side buffer : ', pad(i/mid.length,6,0)
      //console.log(mid[i])
      var midsample=this.mfb.process(mid[i])
      
      mla.push(midsample[0])
      mmla.push(midsample[1])
      mma.push(midsample[2])
      mha.push(midsample[3])
    
      var sidesample=this.sfb.process(side[i])
      sla.push(sidesample[0])
      smla.push(sidesample[1])
      sma.push(sidesample[2])
      sha.push(sidesample[3])
      console.log('mid [low,midlow,mid,high] / side [low,midlow,mid,high]: ',midsample,sidesample)
    }
    var tempObj={
      mh:this.mh.process(mha),
      mm:this.mm.process(mma),
      mml:this.mml.process(mmla),
      ml:this.ml.process(mla),
      sh:this.sh.process(sha),
      sm:this.sm.process(sma),
      sml:this.sml.process(smla),
      sl:this.sl.process(sla),
    }
    return({
      monoMeanArray:
        [
          tempObj.ml.mean, 
          tempObj.mml.mean, 
          tempObj.mm.mean, 
          tempObj.mh.mean
        ],
      monoDevArray:
        [
          tempObj.ml.dev,
          tempObj.mml.dev,
          tempObj.mm.dev,
          tempObj.mh.dev
        ],
      sideMeanArray:
        [
          tempObj.sl.mean,
          tempObj.sml.mean,
          tempObj.sm.mean,
          tempObj.sh.mean
        ],
      sideDevArray:
        [
          tempObj.sl.dev,
          tempObj.sml.dev,
          tempObj.sm.dev,
          tempObj.sh.dev
        ]
    })
    
  
  }
  function SQUWBS(SR){
    var barkscale = [175,2750,6600]
    this.SEQ=new FOURBAND(barkscale,SR)
    this.MEQ=new FOURBAND(barkscale,SR)
    this.MM=new MATCHER()
    this.SM=new MATCHER()
    var refStats={
      monoMeanArray:[0.042045691939235255, 0.30350496273493044, 0.11162788789494214, 0.008448073265478086],
      monoDevArray:[0.05534535221208015, 0.3960832520494717, 0.14692152044358975, 0],
      sideMeanArray:[0.0024129038023947683, 0.029907691106377872, 0.011327437907067852, 0.0008545722599771934],
      sideDevArray:[0.0031832037448466218, 0.039556932569829624, 0.015011548049436968, 0]
    }
    var monoRef = {
      meanArray:refStats.monoMeanArray,
      devArray:refStats.monoDevArray
    }
    var sideRef = {
      meanArray:refStats.sideMeanArray,
      devArray:refStats.sideDevArray
    }
    this.MM.setRef(monoRef)
    this.SM.setRef(sideRef)
  }
  SQUWBS.prototype.setRef=function(refObj){
    var monoRef = {
      meanArray:refObj.monoMeanArray,
      devArray:refObj.monoDevArray
    }
    var sideRef = {
      meanArray:refObj.sideMeanArray,
      devArray:refObj.sideDevArray
    }
    this.MM.setUser(monoRef)
    this.SM.setUser(sideRef)
  }
  SQUWBS.prototype.setUser=function(userObj){
    var monoRef = {
      meanArray:userObj.monoMeanArray,
      devArray:userObj.monoDevArray
    }
    var sideRef = {
      meanArray:userObj.sideMeanArray,
      devArray:userObj.sideDevArray
    }
    this.MM.setUser(monoRef)
    this.SM.setUser(sideRef)
  }
  SQUWBS.prototype.process=function(left,right){
    var mono = (left+right)/2
    var leftOnly = left-mono
    var mid=this.MM.process(this.MEQ.process(mono))
    var side=this.SM.process(this.SEQ.process(leftOnly))
    return(
      {
        left:mid+side,
        right:mid-side
      }
    )
  }
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
        //coi=Math.floor(i/ratio);
        coi=(i/ratio);
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
var barkscale = [175,2750,6600]
//var barkscale = [0,51,127,200,270,370,440,530,640,770,950,1200,1550,19500];
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
    track.prototype.bufferLeft=[];
    track.prototype.bufferRight=[];
    track.prototype.bufferMono=[];
    track.prototype.bufferRightOnly=[];
    track.prototype.bufferLeftOnly=[];
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
        //this.mono = SRConverter(this.bufferMono,this.bufferSampleRate,44100)
        //this.leftOnly=SRConverter(this.bufferLeftOnly,this.bufferSampleRate,44100)
        this.sampleLength=this.bufferMono.length
        for (var i =0; i<barkscale.length+1; i++){
            this.monoMatrix[i] =new Array(this.bufferMono.length);
            this.sideMatrix[i] = new Array(this.bufferMono.length);
            this.monoMeanArray[i]=0.0
            this.sideMeanArray[i]=0.0
            this.monoDeviationArray[i]=0.0
            this.sideDeviationArray[i]=0.0
            if(i<barkscale.length){
                //console.log('filterarray')
                this.monoHPArray[i]=new HP(barkscale[i],44100)
                this.sideHPArray[i]=new HP(barkscale[i],44100)
                this.monoLPArray[i]=new LP(barkscale[i],44100)
                this.sideLPArray[i]=new LP(barkscale[i],44100)
            }
        }
    }
    track.prototype.enterTheMatrix=function(){
        this.newMatrix()
        console.log('entered the matrix')

        var k = this.sampleLength*2+1
        var analysisLength=this.sampleLength*barkscale.length*3+this.sampleLength*2+1
        for (var i =0; i<barkscale.length+1; i++){
            document.getElementById('console').innerHTML='analyzing : '+ k+'/'+analysisLength
            if (i==0){
                for (var j = 0; j<this.sampleLength; j++){
                    document.getElementById('console').innerHTML='analyzing : '+k+'/'+analysisLength
                    //this.monoMean+=Math.floor(Math.abs(this.bufferMono[j])/this.sampleLength)
                    //console.log(Math.abs(this.leftOnly[j]))
                    //this.sideMean+=Math.floor(Math.abs(this.leftOnly[j])/this.sampleLength)
                    this.monoMean+=(Math.abs(this.bufferMono[j])/this.sampleLength)
                    //console.log(Math.abs(this.leftOnly[j]))
                    this.sideMean+=(Math.abs(this.bufferLeftOnly[j])/this.sampleLength)
                    
                    var monoLP = this.monoLPArray[i]
                    var sideLP = this.sideLPArray[i]
                    var tempMono =monoLP.process(this.bufferMono[j])
                    var tempSide =sideLP.process(this.bufferLeftOnly[j])
                    this.monoMatrix[i][j]=tempMono
                    this.sideMatrix[i][j]=tempSide
                    this.monoMeanArray[i]+=Math.abs(tempMono)/this.sampleLength
                    this.sideMeanArray[i]+=Math.abs(tempSide)/this.sampleLength
                    k++
                }
            }
            else if(i==barkscale.length){
                for (var j = 0; j<this.sampleLength; j++){
                    document.getElementById('console').innerHTML='analyzing : '+k+'/'+analysisLength
                    var monoHP = this.monoHPArray[i-1]
                    var sideHP = this.sideHPArray[i-1]
                    var tempMono =monoHP.process(this.bufferMono[j])
                    var tempSide =sideHP.process(this.bufferLeftOnly[j])
                    this.monoMatrix[i][j]=tempMono
                    this.sideMatrix[i][j]=tempSide
                    this.monoMeanArray[i]+=Math.abs(tempMono)/this.sampleLength
                    this.sideMeanArray[i]+=Math.abs(tempSide)/this.sampleLength
                    k++
                }
            }
            else{
                for (var j = 0; j<this.sampleLength; j++){
                    document.getElementById('console').innerHTML='analyzing : '+k+'/'+analysisLength
                    var monoHP = this.monoHPArray[i-1]
                    var sideHP = this.sideHPArray[i-1]
                    var monoLP = this.monoLPArray[i]
                    var sideLP = this.sideLPArray[i]
                    //console.log(this.mono[j])

                    var tempMono = monoLP.process(monoHP.process(this.bufferMono[j]))
                    var tempSide = sideLP.process(sideHP.process(this.bufferLeftOnly[j]))
                    this.monoMatrix[i][j]=tempMono
                    this.sideMatrix[i][j]=tempSide
                    this.monoMeanArray[i]+=Math.abs(tempMono)/this.sampleLength
                    this.sideMeanArray[i]+=Math.abs(tempSide)/this.sampleLength
                    this.monoVariance += Math.abs(Math.abs(this.bufferMono[i])-this.monoMean)/this.sampleLength
                    this.sideVariance += Math.abs(Math.abs(this.bufferLeftOnly[i])-this.sideMean)/this.sampleLength
                    //console.log(tempMono)
                    k++
                }
            }
            

            
        }
            for (var i =0; i<barkscale.length; i++){
                document.getElementById('console').innerHTML='analyizing : '+ k+'/'+analysisLength 
                for (var j = 0; j<this.sampleLength; j++){
                    document.getElementById('console').innerHTML='analyzing : '+k+'/'+analysisLength
                    this.monoDeviationArray[i] +=  (Math.abs(this.monoMatrix[i][j]-this.monoMeanArray[i]))/this.sampleLength;
                    this.sideDeviationArray[i] +=  (Math.abs(this.sideMatrix[i][j]-this.sideMeanArray[i]))/this.sampleLength;
                    k++
                }
            }
            document.getElementById('console').innerHTML='Complete. Press another button.'
    }
    
}
var mainObj 
var referenceObj
//var referenceObj = referenceStats
// var referenceObj = new track()
// referenceObj.monoMeanArray=[0.042045691939235255, 0.30350496273493044, 0.11162788789494214, 0.008448073265478086]
// referenceObj.monoDeviationArray=[0.05534535221208015, 0.3960832520494717, 0.14692152044358975, 0]
// referenceObj.sideMeanArray=[0.0024129038023947683, 0.029907691106377872, 0.011327437907067852, 0.0008545722599771934]
// referenceObj.sideDeviationArray=[0.0031832037448466218, 0.039556932569829624, 0.015011548049436968, 0]
// referenceObj.online=true
// var referenceObj = {
//     monoMeanArray:[0.042045691939235255, 0.30350496273493044, 0.11162788789494214, 0.008448073265478086],
//     monoDeviationArray:[0.05534535221208015, 0.3960832520494717, 0.14692152044358975, 0],
//     sideMeanArray:[0.0024129038023947683, 0.029907691106377872, 0.011327437907067852, 0.0008545722599771934],
//     sideDeviationArray:[0.0031832037448466218, 0.039556932569829624, 0.015011548049436968, 0],
//     online:true
// }
function reset(){

    mainObj = new track()
    referenceObj = new track()
    // referenceObj.monoMeanArray=[0.042045691939235255, 0.30350496273493044, 0.11162788789494214, 0.008448073265478086]
    // referenceObj.monoDeviationArray=[0.05534535221208015, 0.3960832520494717, 0.14692152044358975, 0]
    // referenceObj.sideMeanArray=[0.0024129038023947683, 0.029907691106377872, 0.011327437907067852, 0.0008545722599771934]
    // referenceObj.sideDeviationArray=[0.0031832037448466218, 0.039556932569829624, 0.015011548049436968, 0]
    // referenceObj.online=true
    originalTrackButton.style.display='block'
    referenceTrackButton.style.display='block'
    readButton.style.display='none'
    document.getElementById('console').innerHTML='Ready'
}
reset()
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


//function fileSelect(evt,obj){
function formerFileSelect(evt,obj){
        var files= evt.target.files;
        //console.log(files[0].path)
        var filepath =files[0].path
        //originalFilePath= files[0];
        obj.filePath=filepath;        
        reader = new FileReader();
        if(obj.filePath!==null){
            console.log(filepath)
            document.getElementById('console').innerHTML='Please Wait..'
            var wavInfo=new WaveFile(fs.readFileSync(filepath))

            //console.log(wav)
            wavInfo.toBitDepth(16)
            var stereo=true
            pcm.getPcmData(filepath,{
                stereo:stereo,
                sampleRate:wavInfo.fmt.sampleRate
            },function(sample,channel){
                
                if(obj.max<Math.abs(sample)){
                    obj.max=Math.abs(sample)
                }
                if(channel==0){
                    obj.bufferLeft.push(sample)
                }
                if(channel==1){
                    obj.bufferRight.push(sample)
                  
                }
            
            },function(err,output){
                if (err){
                    console.lor(err)
                }
                //console.log(output)
                for(var i = 0; i<obj.sampleLength+1; i++){
                    document.getElementById('console').innerHTML='recording : '+i
                    var mono = ((obj.bufferLeft[i]+obj.bufferRight[i])/2)
                    obj.bufferMono.push(mono)
                    var leftOnly=obj.bufferLeft[i]-mono
                    obj.bufferLeftOnly.push(leftOnly)

                }
                
                obj.enterTheMatrix(barkscale)
                obj.online = true;   
            })
       }    
};

function fileSelect(evt,obj){
    var files= evt.target.files;
    var filepath =files[0].path
    obj.filePath=filepath;        
    reader = new FileReader();
    if(obj.filePath!==null){
        
        document.getElementById('console').innerHTML='Please Wait..'
        var wavInfo=new WaveFile(fs.readFileSync(filepath))
        var buffer = fs.readFileSync(filepath)
        let int16Factor=Math.pow(2,15)-1
        let result = wav.decode(buffer)
        let left = result.channelData[0].slice()
        let right = result.channelData[1].slice()
        let mono = []
        let leftOnly = []



        for (var i = 0; i<left.length; i++){
            //console.log(i/left.length)
            mono.push((left[i]+right[i]/2))
            leftOnly.push(left[i]-mono[i])
        }
        var analyzer= new STATS(result.sampleRate)
        var stats = analyzer.process(mono,leftOnly)
        console.log(stats)
        var squwbs = new SQUWBS(result.sampleRate)
        squwbs.setUser(stats)
        var interlaced = []
        for(var i =0; i<left.length; i++){
            squwbs.process(mono,leftOnly)
            var temp=squwbs.process(left[i],right[i])
            var temp = squwbs.process
            console.log(left[i])
            left[i]=temp.left
            right[i]=temp.right
            //interlaced.push(temp.left)
            //interlaced.push(temp.right)
        }

        //var wf=new WaveFile()
        //wf.fromScratch(2,result.sampleRate,'32f',interlaced)
        //wf.toBitDepth(16)
        //var encoded= wf.toBuffer()
        //var encoded=wav.encode([left,right],{sampleRate:result.sampleRate, float:true, bitDepth:64}).slice()
        var encoded=wav.encode([left,right],{sampleRate:result.sampleRate, float:true, bitDepth:64}).slice()
        var fullPathDirectory=path.dirname(mainObj.filePath)+'/mastered_files/'
        var fullPathName=fullPathDirectory+path.basename(mainObj.filePath)
        //console.log(fullPathName)
        fs.writeFileSync(fullPathName,encoded)
        //document.getElementById('console').innerHTML='check the file dude'
        document.getElementById('console').innerHTML='created file : '+fullPathName    
    }
       
};


var referenceTrackSelect = function(evt){
    document.getElementById('referenceFile').addEventListener('change',readFile,false);
    function readFile(evt,referencObj){
        fileSelect(evt,referenceObj)
        document.getElementById('console').innerHTML=path.basename(referenceObj.filePath)+ ' has been selected.'
        referenceTrackButton.style.display='none'
        if(mainObj.online==true){
            //referenceObj.enterTheMatrix(barkscale)
            //mainObj.enterTheMatrix(barkscale)
            originalTrackButton.style.display='none'
            //referenceTrackButton.style.display='none'
            readButton.style.display='block'
            //reconstruct()
        }
    }
};
function originalTrackSelect(evt){
    document.getElementById('originalFile').addEventListener('change',readFile,false);
    function readFile(evt){
        fileSelect(evt,mainObj)
        // document.getElementById('console').innerHTML=path.basename(mainObj.filePath)+ ' has been selected.'
        // originalTrackButton.style.display='none'
        // if(referenceObj.online==true){
        //     //mainObj.enterTheMatrix(barkscale)
        //     //referenceObj.enterTheMatrix(barkscale)
        //     // originalTrackButton.style.display='none'
        //     referenceTrackButton.style.display='none'
        //     readButton.style.display='block'
        //     //reconstruct()
        // }
    }
};

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
    //console.log('referenceObj : '+stringifyObject(referenceObj))
    //console.log('mainObj : '+stringifyObject(mainObj))
    var ratio = new ratio(barkscale.length);
    for (var i =0; i<barkscale.length; i++){
        document.getElementById('console').innerHTML=i+'/'+barkscale.length;
        ratio.mono[i]=referenceObj.monoDeviationArray[i]/mainObj.monoDeviationArray[i];
        ratio.side[i]=referenceObj.sideDeviationArray[i]/mainObj.sideDeviationArray[i];
    };
    //console.log('ratio matrix : ',stringifyObject(ratio))
    function soundData(){
        this.left = new Array(mainObj.bufferLeftOnly.length);
        this.right = new Array(mainObj.bufferLeftOnly.length);
        this.left.fill(0);
        this.right.fill(0);
        this.interlaced=new Array();
    };

    var data= new soundData;
    var tempMonoBuffer=[0,0,0,0]
    var tempSideBuffer=[0,0,0,0]
    for (var j =0; j<mainObj.bufferLeftOnly.length; j++){
    var tempMono = 0;
    var tempSide = 0;
        for(var i = 0; i<barkscale.length; i++){
            if(mainObj.monoMatrix[i][j]>=0){
                //tempMono += Math.floor((mainObj.monoMatrix[i][j]-mainObj.monoMeanArray[i])*ratio.mono[i]+referenceObj.monoMeanArray[i])
                tempMono += ((mainObj.monoMatrix[i][j]-mainObj.monoMeanArray[i])*ratio.mono[i]+referenceObj.monoMeanArray[i])
                if(mainObj.sideMatrix[i][j]>=0){
                    // tempSide += Math.floor((mainObj.sideMatrix[i][j]-mainObj.sideMeanArray[i])*ratio.side[i]+referenceObj.sideMeanArray[i])
                    tempSide += ((mainObj.sideMatrix[i][j]-mainObj.sideMeanArray[i])*ratio.side[i]+referenceObj.sideMeanArray[i])
                }
                else if(mainObj.sideMatrix[i][j]<0){
                    //tempSide += Math.floor((mainObj.sideMatrix[i][j]+mainObj.sideMeanArray[i])*ratio.side[i]-referenceObj.sideMeanArray[i])
                    tempSide += ((mainObj.sideMatrix[i][j]+mainObj.sideMeanArray[i])*ratio.side[i]-referenceObj.sideMeanArray[i])
                }  
            }
            
            else if(mainObj.monoMatrix[i][j]<0){
                //tempMono += Math.floor((mainObj.monoMatrix[i][j]+mainObj.monoMeanArray[i])*ratio.mono[i]-referenceObj.monoMeanArray[i])
                tempMono += ((mainObj.monoMatrix[i][j]+mainObj.monoMeanArray[i])*ratio.mono[i]-referenceObj.monoMeanArray[i])
                if(mainObj.sideMatrix[i][j]>=0){
                    //tempSide += Math.floor((mainObj.sideMatrix[i][j]-mainObj.sideMeanArray[i])*ratio.side[i]+referenceObj.sideMeanArray[i])
                    tempSide += ((mainObj.sideMatrix[i][j]-mainObj.sideMeanArray[i])*ratio.side[i]+referenceObj.sideMeanArray[i])
                }
                else if(mainObj.sideMatrix[i][j]<0){
                    //tempSide += Math.floor((mainObj.sideMatrix[i][j]+mainObj.sideMeanArray[i])*ratio.side[i]-referenceObj.sideMeanArray[i])
                    tempSide += ((mainObj.sideMatrix[i][j]+mainObj.sideMeanArray[i])*ratio.side[i]-referenceObj.sideMeanArray[i])
                }  
            } 
            document.getElementById('console').innerHTML=j+'/'+mainObj.bufferLeftOnly.length+'-'+i+'/'+barkscale.length;   
            document.getElementById('console').innerHTML='please wait';   
        }
    tempMonoBuffer.splice(0,1)
    tempSideBuffer.splice(0,1)
    tempMonoBuffer.push(tempMono)
    tempSideBuffer.push(tempSide)
    var tempMonoBufferAverage=0
    var tempSideBufferAverage=0
    for (var i =0; i<tempMonoBuffer.length; i++){
        document.getElementById('console').innerHTML='buffering '+i;   
        tempMonoBufferAverage+=tempMonoBuffer[i]
        tempSideBufferAverage+=tempSideBuffer[i]
    }
    //data.left[j]=tempMono+tempSide
    //data.right[j]=tempMono-tempSide
    data.left[j]=tempMonoBufferAverage+tempSideBufferAverage
    data.right[j]=tempMonoBufferAverage-tempSideBufferAverage
    }
    /*
    var mainWav = new WaveFile(fs.readFileSync(mainObj.filePath.path))
    var refWav = new WaveFile(fs.readFileSync(refObj.filePath.path))
    */
    //var newLeft = SRConverter(data.left,44100,desiredSampleRate);
    //var newRight = SRConverter(data.right,44100,desiredSampleRate);
    var newLeft=data.left
    var newRight=data.right
    for(var i=0; i<newLeft.length; i++){
        //console.log(newLeft[i])
        document.getElementById('console').innerHTML='buffering '+i; 
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
    var max = 0
    for(var i=0; i<data.interlaced.length; i++){
        document.getElementById('console').innerHTML='buffering '+i; 
        if(max<Math.abs(data.interlaced[i])){
            max=data.interlaced[i]
        }
    }
    for(var i=0; i<data.interlaced.length; i++){

        //data.interlaced[i]=Math.floor((data.interlaced[i]/max)*16384/2)
        //data.interlaced[i]=(data.interlaced[i]*16384/max)
        data.interlaced[i]=(data.interlaced[i]/max)*mainObj.max
        document.getElementById('console').innerHTML='buffering '+i; 
    }
    console.log(data.interlaced)
    var fullPathName=fullPathDirectory+path.basename(mainObj.filePath)
    //var wav = new WaveFile()
    //wav.fromScratch(2,desiredSampleRate,'16',[data.interlaced])
   // wav.fromScratch(2,desiredSampleRate,'32f',[data.interlaced])

    //wav.toBitDepth(16)
    var string=typeof(wav.toBuffer())
    console.log(string)
    //console.log(fullPathName)
    fs.writeFileSync(fullPathName,string)
    //document.getElementById('console').innerHTML='check the file dude'
    document.getElementById('console').innerHTML='created file : '+fullPathName
    var arrayForNumpy = new Array(newLeft.length);
    document.getElementById('read').style.display='none'
    for (var i =0; i<newLeft.length; i++){
        arrayForNumpy[i]=[newLeft[i],newRight[i]];
    };
    mastered ={
        float:true,
        symmetric:true,
        bitDepth:16,
        sampleRate:desiredSampleRate,
        channelData:[
            newLeft,
            newRight
        ],
        forNumpy:arrayForNumpy,
        sendto:targetaddress
    };
    var masteredJSON = JSON.stringify(mastered);


    return masteredJSON;
    

};

var readButtonPressed = function(){

    var desiredSampleRate = 44100
    document.getElementById('console').innerHTML=('initiating json data sending')
    var JSONdata = reconstruct(mainObj,referenceObj,desiredSampleRate);
 
}


var bins = barkscale.length;   
   

function send_data_to_server(data){
    document.getElementById('console').innerHTML='sending data to email address';
    var request = new XMLHttpRequest();

    "url needs to be updated once flask is deployed"

    request.open('POST','bernardahn.pythonanywhere.com',true);
    request.setRequestHeader("content-type","application/json");
    request.send(data);
    document.getElementById('console').innerHTML='done! please check your email';
};
