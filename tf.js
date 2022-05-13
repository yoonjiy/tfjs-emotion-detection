const video = document.getElementById('webcam');
const instruction = document.getElementById('caminstruct');
const liveView = document.getElementById('liveView');
const enableWebcamButton = document.getElementById('webcamButton');
const instructionText = document.getElementById("camiText");
const webcam_canvas = document.getElementById('webcam_canvas');
const cam_ctx = webcam_canvas.getContext('2d');
const width = 640
const height = 480
let model = undefined;
let model_emotion = undefined;
let control = false;
let emotion = [0, 0, 0, 0, 0, 0, 0];
let count = 0;
let label = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"];
// Error fallback when webcam access is denied.
let errorCallback = function(error) {
  if (error.name == 'NotAllowedError') {instructionText.innerHTML = "Webcam Access Not Allowed";}
	else if(error.name == 'PermissionDismissedError')  {instructionText.innerHTML = "Permission Denied. Please provide Webcam Access."; }

};

// Function to handle enableWebcamButton click.
// Takes video feed and the call predictWebcam function.
function enableCam() {
	control = true;
	const constraints = {
	  audio: false,
	  video: { width: 640, height: 480 },
	};

	// Activate the webcam stream.
	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		video.srcObject = stream;
		instruction.style.display = "none";
		document.getElementById("cam_chart_main").style.left = 0;
		video.addEventListener('loadeddata', predictWebcam());
		cameraaccess = true;
	}).catch(errorCallback)
}

function getUserMediaSupported() {
  return (navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

if (getUserMediaSupported()) {
	blazeface.load().then(function (loadedModel) {
		model = loadedModel;
	});
	tf.loadLayersModel('model/model.json', false).then(function (loadedModel) {
		model_emotion = loadedModel;
	});

	setTimeout(function(){
		enableCam();
	}, 21000);
} else {
	console.warn('getUserMedia() is not supported by your browser');
	instructionText	.innerHTML = "getUserMedia() is not supported by your browser"
}


function predictWebcam() {
	cam_ctx.drawImage(video, 0, 0, width, height);
	const frame =cam_ctx.getImageData(0, 0, width, height);

	model.estimateFaces(frame).then(function (predictions) {
		if(predictions.length === 1) {
			landmark = predictions[0]['landmarks'];
			nosex = landmark[2][0];
			nosey = landmark[2][1];
			right = landmark[4][0];
			left = landmark[5][0];
			length = (left-right)/2 + 5;
			//이미지 크롭
			const frame2 = cam_ctx.getImageData(nosex - length, nosey-length, 2*length, 2*length);
			//Image is converted to tensor - resize, dimension 추가. [1, 48, 48, 1] 로 바꿔서 모델로 전달.
			let image_tensor = tf.browser.fromPixels(frame2).resizeBilinear([48, 48]).mean(2).toFloat().expandDims(0).expandDims(-1);

			const result = model_emotion.predict(image_tensor);
			const predictedValue = result.arraySync();

			count_result(predictedValue, emotion);

			if(count>=10){
				get_result(emotion);
			}

			document.getElementById("angry").style.width = 100*predictedValue['0'][0]+"%";
			document.getElementById("disgust").style.width = 100*predictedValue['0'][1]+"%";
			document.getElementById("fear").style.width = 100*predictedValue['0'][2]+"%";
			document.getElementById("happy").style.width = 100*predictedValue['0'][3]+"%";
			document.getElementById("sad").style.width = 100*predictedValue['0'][4]+"%";
			document.getElementById("surprise").style.width = 100*predictedValue['0'][5]+"%";
			document.getElementById("neutral").style.width = 100*predictedValue['0'][6]+"%";

		}

		// Call this function again to keep predicting when the browser is ready.
		if( control ){
			window.requestAnimationFrame(predictWebcam);
		}

	});
}

function count_result(predicted, emotion){
	//predicted 값이 1이면 해당 index의 emotion 증가
	let idx = 0;
	for (let value of predicted['0']){
		if(value===1){
			emotion[idx]++;
		}
		idx++;
	}
}

function get_result(emotion){
	let result_index = emotion.reduce((imax, x, i, arr) => x > arr[imax] ? i : imax, 0);
	let result = label[result_index];
	window.parent.postMessage({message: result}, "*");
}

let count_time = setInterval(function () {
	count++;
	if(count > 10){
		get_result(emotion);
		clearInterval(count_time);
		count = 0;
	}}, 1000);


