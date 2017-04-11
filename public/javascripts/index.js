function init () {
	var musicArr = document.querySelectorAll(".music-list .music-item");
	musicArr.forEach(function (musicItem) {
		musicItem.onclick = function (event) {
			var item = event.target;
			var itemClass = item.className;
			var musicParent = item.parentElement;
			var items = musicParent.querySelectorAll(".music-item");
			items.forEach(function (child) {
				child.className =  child.className.replace(/(^|\s)active($|\s)/,'');
			});
			if (!/ (^|\s)active($|\s)/.test(itemClass)) {
            	item.className = item.className + ' active';
			}
			loadMusic('/audios/'+item.textContent,item)
		}
	})

	inputChange();
	visualizer();

	initCanvas();
	window.onresize = resize;
	resize();

	initTypeController()
}

window.onload = init;

var audioCxt = new (window.AudioContext||window.webkitAudioContext)();
var gainNode = audioCxt[audioCxt.createGain?'createGain':'createGainNode']();
gainNode.connect(audioCxt.destination);
var sourceMap = {};
var count = 0;
var analyser = audioCxt.createAnalyser();
var singleBitSize = 128;
analyser.fftSize = singleBitSize * 2;
analyser.connect(gainNode);

function loadMusic (url,item) {
	if (sourceMap.currentMusic) {
		var currentBufferSource = sourceMap[sourceMap.currentMusic]
		currentBufferSource[currentBufferSource.stop?'stop':'noteoff']();
	}
	// if (!sourceMap[url]) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url);
		xhr.responseType = "arraybuffer";
		sourceMap.url = {};
		var localNum = ++ count;
		xhr.onreadystatechange = function () {
			if (xhr.readyState == 4 ) {
				if (xhr.status == 200) {
					// item.dataset.music = true;
					if (localNum != count) {
						return;
					}
					audioCxt.decodeAudioData(xhr.response,function (buffer) {
						if (localNum != count) {
							return;
						}
						var bufferSource = audioCxt.createBufferSource();
						bufferSource.buffer = buffer;
						bufferSource.connect(analyser);
						bufferSource[bufferSource.start?"start":"noteOn"](0);
						sourceMap.currentMusic = url
						bufferSource.noteOn(0)
						sourceMap[url]= bufferSource;
					},function (error) {
						console.log('decodeAudioData-error',error)
					});
				}else{
					console.log('error:',xhr)
					sourceMap.url = null;
				}
			}
		}
		xhr.send();
	// }else{
	// 	console.log(audioCxt)
	// 	var bufferSource = sourceMap[url];
	// 	bufferSource[bufferSource.start?"start":"noteOn"](0);
	// }
}

function changeVolume(value){
	gainNode.gain.value = value;
}

//初始化音量控件
function inputChange () {
	var volumeInput = document.getElementById('volume-controller');
	volumeInput.oninput = function (event) {
		changeVolume(this.value/this.max);
	}
	volumeInput.oninput();
}

//监听音频数据
function visualizer() {
	var bufferArr = new Uint8Array(analyser.frequencyBinCount);
	var requestAnimationFrameJ = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame
	function observerJ () {
		analyser.getByteFrequencyData(bufferArr);
		// console.log(bufferArr);
		drawMusicCanves(bufferArr);
		requestAnimationFrameJ(observerJ);
	}
	requestAnimationFrameJ(observerJ);
}

var musicCanvas,canvasContext,canvasTypes = {DOT:"dot",HISTOGRAM:"histogram",DOTCOLOR:"DOTCOLOR"},currentCanvasType = canvasTypes.HISTOGRAM;
function initCanvas () {
	musicCanvas = document.getElementById("music-canvas");
	canvasContext = musicCanvas.getContext("2d");
}

var line
function resize () {
	var rightContent = document.querySelector(".right");
	musicCanvas.width = rightContent.clientWidth;
	musicCanvas.height = rightContent.clientHeight;
	line = canvasContext.createLinearGradient(0,0,0,rightContent.clientHeight);
	line.addColorStop(0,"red");
	line.addColorStop(0.5,"yellow");
	line.addColorStop(1,"green");
	canvasContext.fillStyle = line;
	getDOts();
}

var lineDotHStep = 1,lineDotPadding = 15,dotStep = 5
function drawMusicCanves (arr) {
	canvasContext.clearRect(0,0,musicCanvas.width,musicCanvas.height);
	for(var k = 0; k < singleBitSize; k++){
		if (currentCanvasType == canvasTypes.DOT || currentCanvasType == canvasTypes.DOTCOLOR) {
			canvasContext.beginPath();
			var dotR = dotMax * arr[k]/(singleBitSize*2);
			dots[k].x = dots[k].x > musicCanvas.width ? 0 : dots[k].x
			var xPos = dots[k].x ,yPos = dots[k].y;
			canvasContext.arc(xPos,yPos,dotR,0,Math.PI*2,true)
			if (currentCanvasType == canvasTypes.DOT) {
				canvasContext.strokeStyle = "#FFF";
				canvasContext.stroke();
				// dots[k].outDotR = dots[k].outDotR < 0 ? 0 : dots[k].outDotR;
				// var outR = dots[k].outDotR;
				// outR = (dots[k].lineDotH < dotR + lineDotPadding && dotR > 0 ) ? dotR + lineDotPadding : dots[k].outDotR
				// canvasContext.beginPath();
				// canvasContext.arc(xPos,yPos,outR,0,Math.PI*2,true);
				// canvasContext.stroke();
				// dots[k].outDotR -= lineDotHStep;
			}else if (currentCanvasType == canvasTypes.DOTCOLOR) {
				dots[k].x  += dotStep * arr[k]/(singleBitSize*2);
				var arcG = canvasContext.createRadialGradient(xPos,yPos,0,xPos,yPos,dotR);
				arcG.addColorStop(0,dots[k].color);
				/^rgb\((.+)\)$/.test(dots[k].color);
				var middleColor = "rgba("+RegExp.$1+",0.4)"
				arcG.addColorStop(0.6,middleColor);
				arcG.addColorStop(1,"rgba(255,255,255,0)");
				canvasContext.fillStyle = arcG;
				canvasContext.fill()
			}
		}else if(currentCanvasType = canvasTypes.HISTOGRAM){
			canvasContext.fillStyle = line;
			var lineHeight = musicCanvas.height / (singleBitSize*2) * arr[k];
			var lineWidth = musicCanvas.width / singleBitSize
			canvasContext.fillRect(lineWidth*k,musicCanvas.height-lineHeight,lineWidth,lineHeight);
			dots[k].lineDotH = dots[k].lineDotH < 0  ? 0 : dots[k].lineDotH;
			var dotH = dots[k].lineDotH < lineHeight + lineDotPadding && lineHeight > 0 ? lineHeight + lineDotPadding : dots[k].lineDotH;
			var dotHeight = lineWidth * 0.5
			canvasContext.fillRect(lineWidth*k,musicCanvas.height-dotH-dotHeight,lineWidth,dotHeight)
			dots[k].lineDotH -= lineDotHStep;
		}
	}
}

var dots ,dotMax = 40
function getDOts () {
	dots = []
	for(var i = 0;i<singleBitSize;i++){
		var dot ={};
		dot.x = getRandomInRange(0,musicCanvas.width);
		dot.y = getRandomInRange(0,musicCanvas.height);
		dot.color = "rgb("+getRandomInRange(0,255)+","+getRandomInRange(0,255)+","+getRandomInRange(0,255)+")";
		dot.lineDotH = 0;
		dot.outDotR = 0;
		dots.push(dot);
	}
}

function getRandomInRange(start,end) {
	if (end<=start) {
		return 0 ;
	}
	return Math.round(Math.random()*(end -start))+start;
}


//初始化canvasType切换
function initTypeController () {
	var controllers = document.querySelectorAll(".canvas-control .type-item");
	controllers.forEach(function (item) {
		item.onclick = function (event) {
			controllers.forEach(function (child) {
				child.className =  child.className.replace(/(^|\s)checked($|\s)/,'');
			});
			if (!/ (^|\s)checked($|\s)/.test(this.className)) {
            	this.className = this.className + ' checked';
            	currentCanvasType = canvasTypes[this.textContent];
			}
		}
	})
}

