window.onload = () => {
    'use strict';

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./sw.js');
    }
    camStart();
}

// Override the function with all the posibilities
navigator.getUserMedia ||
    (navigator.getUserMedia = navigator.mozGetUserMedia ||
        navigator.webkitGetUserMedia || navigator.msGetUserMedia);

var gl;
var canvas;
var Param1 = 1.0;
var Param2 = 1.0;
var Param3 = 1.0;
var Param4 = 1.0;
var mouseX = 0.5;
var mouseY = 0.5;
var keyState1 = 0;
var keyState2 = 0;
var keyState3 = 0;
var keyState4 = 0;
var volume = 0.7;

function initGL() {
    try {
        gl = canvas.getContext("experimental-webgl", {
            antialias: true
        });
        //            gl = canvas.getContext("experimental-webgl", {preserveDrawingBuffer: true});
    } catch (e) {}
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "f") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "v") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var programsArray = new Array();
var current_program;
var index = 0;

function initShaders() {
    programsArray.push(createProgram("shader-vs", "shader-1-fs"));
    current_program = programsArray[0];
}

function createProgram(vertexShaderId, fragmentShaderId) {
    var shaderProgram;
    var fragmentShader = getShader(gl, fragmentShaderId);
    var vertexShader = getShader(gl, vertexShaderId);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    //       gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.resolutionUniform = gl.getUniformLocation(shaderProgram, "resolution");
    shaderProgram.mouse = gl.getUniformLocation(shaderProgram, "mouse");
    shaderProgram.time = gl.getUniformLocation(shaderProgram, "time");
    shaderProgram.Param1 = gl.getUniformLocation(shaderProgram, "Param1");
    shaderProgram.Param2 = gl.getUniformLocation(shaderProgram, "Param2");
    shaderProgram.Param3 = gl.getUniformLocation(shaderProgram, "Param3");
    shaderProgram.Param4 = gl.getUniformLocation(shaderProgram, "Param4");
    return shaderProgram;
}

var webcam;
var texture;

function initTexture() {
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

var ix = 0.0;
var end;
var st = new Date().getTime();

function setUniforms() {
    end = new Date().getTime();
    gl.uniformMatrix4fv(current_program.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(current_program.mvMatrixUniform, false, mvMatrix);
    gl.uniform2f(current_program.resolutionUniform, canvas.width, canvas.height);
    gl.uniform2f(current_program.mouse, mouseX, mouseY);
    gl.uniform1f(current_program.time, ((end - st) % 1000000) / 1000.0);
    gl.uniform1f(current_program.Param1, Param1);
    gl.uniform1f(current_program.Param2, Param2);
    gl.uniform1f(current_program.Param3, Param3);
    gl.uniform1f(current_program.Param4, Param4);
}

var cubeVertexPositionBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexIndexBuffer;

function initBuffers() {
    cubeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    vertices = [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeVertexPositionBuffer.itemSize = 2;
    cubeVertexPositionBuffer.numItems = 4;

    cubeVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    var textureCoords = [0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    cubeVertexTextureCoordBuffer.itemSize = 2;
    cubeVertexTextureCoordBuffer.numItems = 4;

    cubeVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    var cubeVertexIndices = [0, 1, 2, 0, 2, 3];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    cubeVertexIndexBuffer.itemSize = 1;
    cubeVertexIndexBuffer.numItems = 6;
}

function drawScene() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.enable(gl.BLEND);

    mat4.ortho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0, pMatrix);

    gl.useProgram(current_program);
    mat4.identity(mvMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    gl.vertexAttribPointer(current_program.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    //        gl.vertexAttribPointer(current_program.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, webcam);
    gl.uniform1i(current_program.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    setUniforms();
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
}

function tick() {
    requestAnimFrame(tick);
    drawScene();
}

function webGLStart() {
    canvas = document.getElementById("webgl-canvas");
    if (screen.width > 1500 || screen.height > 1500) {
        canvas.width = 1024;
        canvas.height = 1024;
    } else {
        canvas.width = 512;
        canvas.height = 512;
    }
    initGL();
    initShaders();
    initBuffers();
    initTexture();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    tick();
}

function loadPicture(i) {
    var fireplace = document.querySelector('fireplace');
    var s = "url(images/fireplace" + i + ".png)";
    fireplace.style.backgroundImage = s;
    // fireplace.src = s;
}

var fireplc = 0;

function Action(i) {
    fireSound();
    switch (i) {
        case 1: // style
            Param1 = Param1 + 1;
            if (Param1 > 4)
                Param1 = 1;
            break;
        case 2: // speed
            Param3 = Param3 + 1;
            if (Param3 > 3)
                Param3 = 1;
            break;
        case 3: // left
            fireplc = fireplc - 1;
            if (fireplc < 0) fireplc = 8;
            loadPicture(fireplc);
            break;
        case 4: // right
            fireplc = fireplc + 1;
            if (fireplc > 8) fireplc = 0;
            loadPicture(fireplc);
            break;
    }
}

function toggleButtons() {
    var button1 = document.querySelector('button1');
    var button3 = document.querySelector('button3');
    var buttonl = document.querySelector('buttonl');
    var buttonr = document.querySelector('buttonr');
    button1.hidden = !button1.hidden;
    button3.hidden = !button3.hidden;
    buttonl.hidden = !buttonl.hidden;
    buttonr.hidden = !buttonr.hidden;
}

function MonitorKeyDown(e) { // stop autorepeat of keys with KeyState1-4 flags
    if (!e) e = window.event;
    if (e.keyCode == 32 || e.keyCode == 49) {
        if (keyState1 == 0)
            Action(1);
    } else if (e.keyCode == 50 || e.keyCode == 13) {
        if (keyState2 == 0)
            Action(2);
        keyState2 = 1;
    } else if (e.keyCode == 53) {
        toggleButtons();
    } else if (e.keyCode == 189) { // +
        Action(3);
    } else if (e.keyCode == 187) { // -
        Action(4);
    }
    return false;
}

function MonitorKeyUp(e) {
    if (!e) e = window.event;
    if (e.keyCode == 32 || e.keyCode == 49) {
        keyState1 = 0;
    } else if (e.keyCode == 50 || e.keyCode == 13) {
        keyState2 = 0;
    }
    return false;
}

var mouseState = 0;

function MonitorMouseDown(e) {
    if (!e) e = window.event;
    if (e.button == 0) {
        mouseState = 1;
        mouseX = e.clientX / canvas.scrollWidth;
        mouseY = 1.0 - e.clientY / canvas.scrollHeight;
    }
    //    var c = document.getElementById("container");
    //    c.style.filter = "sepia(1) hue-rotate(230deg) saturate(2)";
    toggleButtons();
    return false;
}

function MonitorMouseUp(e) {
    if (!e) e = window.event;
    if (e.button == 0) {
        mouseState = 0;
    }
    //    var c = document.getElementById("container");
    //    c.style.filter = "grayscale(0)";
    return false;
}


var c = document.getElementById("body");
var sound;

function fireSound() {
    if (typeof sound !== 'undefined')
        sound.stop();
    var s = "sounds/" + Math.floor(Math.random() * 5 + 1) + ".mp3";
    sound = new Howl({
        src: [s],
        loop: true,
        volume: volume,
    });
    sound.play();
}

function camStart() {
    var splash = document.querySelector('splash');
    var fireplace = document.querySelector('fireplace');
    var buttonl = document.querySelector('buttonl');
    var buttonr = document.querySelector('buttonr');
    var button1 = document.querySelector('button1');
    var button3 = document.querySelector('button3');
    webcam = document.createElement('canvas'); //getElementById('webcam');



    keyState1 = 0;
    keyState2 = 0;
    keyState3 = 0;
    keyState4 = 0;

    //Param1 = Math.random(); // for Electra
    //Param2 = Math.random();

    splash.onclick = function (e) {
        if (document.body.requestFullscreen) {
            document.body.requestFullscreen();
        } else if (document.body.msRequestFullscreen) {
            document.body.msRequestFullscreen();
        } else if (document.body.mozRequestFullScreen) {
            document.body.mozRequestFullScreen();
        } else if (document.body.webkitRequestFullscreen) {
            document.body.webkitRequestFullscreen();
        }
        splash.hidden = true;
        fireSound();
    }
    window.setTimeout(function() {
       if (document.body.requestFullscreen) {
         document.body.requestFullscreen();
       } else if (document.body.msRequestFullscreen) {
         document.body.msRequestFullscreen();
       } else if (document.body.mozRequestFullScreen) {
         document.body.mozRequestFullScreen();
       } else if (document.body.webkitRequestFullscreen) {
         document.body.webkitRequestFullscreen();
       }
        splash.hidden = true;
    }, 2500); // hide Splash screen after 2.5 seconds
    
    webGLStart();

    document.onkeydown = MonitorKeyDown;
    document.onkeyup = MonitorKeyUp;

    canvas.onmousedown = MonitorMouseDown;
    canvas.onmouseup = MonitorMouseUp;
    canvas.onmousemove = function (e) {
        e = e || window.event;
        if (mouseState == 1) {
            mouseX = (mouseX + 7.0 * e.clientX / canvas.scrollWidth) / 8.0;
            mouseY = (mouseY + 7.0 * (1.0 - e.clientY / canvas.scrollHeight)) / 8.0;
        }
    }
    canvas.ontouchstart = function (e) {
        e.preventDefault();
        toggleButtons();
        var touchs = e.changedTouches;
        mouseX = touchs[0].clientX / canvas.scrollWidth;
        mouseY = 1.0 - touchs[0].clientY / canvas.scrollHeight;
        c.style.filter = "sepia(1) hue-rotate(230deg) saturate(2)";
    };
    canvas.ontouchend = function (e) {

        e.preventDefault();
        c.style.filter = "grayscale(0)";
    };
    canvas.ontouchmove = function (e) {
        e.preventDefault();
        var touches = e.changedTouches;
        mouseX = touches[0].clientX / canvas.scrollWidth; //] (mouseX + 7.0*touches/canvas.scrollWidth)/8.0;
        mouseY = 1.0 - touches[0].clientY / canvas.scrollHeight; //(mouseY + 7.0*(1.0 - e.clientY/canvas.scrollHeight))/8.0;
    };
    fireplace.onmousedown = function (e) {
        toggleButtons();
    }
    button1.onmousedown = function (e) {
        Action(1);
    }
    button3.onmousedown = function (e) {
        Action(2);
    }
    buttonl.onmousedown = function (e) {
        Action(3);
    }
    buttonr.onmousedown = function (e) {
        Action(4);
    }
    buttonl.ontouchstart = function (e) {
        e.preventDefault();
        Action(3);
    }
    buttonr.ontouchstart = function (e) {
        e.preventDefault();
        Action(4);
    }
    button1.ontouchstart = function (e) {
        e.preventDefault();
        Action(1);
    }
    button3.ontouchstart = function (e) {
        e.preventDefault();
        Action(2);
    }

    function showPressedButton(index) {
        console.log("Press: ", index);
        if (!splash.hidden) {
            splash.hidden = true;
        } else switch (index) {
            case 0: // A
                Action(1);
                break;
            case 6:
            case 7:
            case 8:
            case 9:
            case 11:
            case 16:
                Action(1);
                break;
            case 1: // B
                Action(2);
                break;
            case 2: // X
                Action(3);
                break;
            case 4: // LT
                Action(1);
                break;
            case 3: // Y
                Action(4);
                break;
            case 5: // RT
                Action(2);
                break;
            case 10: // XBox
                break;
            case 14: // dpad left
                Action(3);
                break;
            case 15: // dpad right
                Action(4);
                break;
            case 12: // dpad up
                volume += .1;
                if (volume > 1)
                    volume = 1;
                sound.volume(volume);
                break;
            case 13: // dpad down
                volume -= .1;
                if (volume < 0)
                    volume = 0;
                sound.volume(volume);
                break;
            default:
        }
    }

    var gpad;


    gamepads.addEventListener('connect', e => {
        console.log('Gamepad connected:');
        console.log(e.gamepad);
        //     Highlight();
        gpad = e.gamepad;
        e.gamepad.addEventListener('buttonpress', e => showPressedButton(e.index));
        //        e.gamepad.addEventListener('buttonrelease', e => removePressedButton(e.index));
    });

    gamepads.addEventListener('disconnect', e => {
        console.log('Gamepad disconnected:');
        console.log(e.gamepad);
    });

    gamepads.start();
}
