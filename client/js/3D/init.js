import * as Matrix from './matrix'
import * as web3d from './hi3d'
//import * as Init from './init'
import * as Cameralib from './camera'
import * as HUDlib from './HUD'
var OFFSCREEN_WIDTH = 2048, OFFSCREEN_HEIGHT = 2048;
var LIGHT_X = -10, LIGHT_Y = 20, LIGHT_Z = 28; // Position of the light source

var fbo = null;
// console.log(wx.getSystemInfoSync().screenWidth);
 console.log(wx.getSystemInfoSync().windowWidth)
console.log(wx.getSystemInfoSync().windowHeight)
// console.log(canvas.width)
// canvas.width = wx.getSystemInfoSync().windowHeight
// canvas.height = wx.getSystemInfoSync().windowWidth
//const gl = web3d.getWebGLContext(canvas, { antialias: true });
const gl = canvas.getContext('webgl', { antialias: true });
const CWidth = wx.getSystemInfoSync().screenWidth;
const CHeight = wx.getSystemInfoSync().windowHeight;
var SHADOW_VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '}\n';

// Fragment shader program for generating a shadow map
var SHADOW_FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'void main() {\n' +
  '  const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);\n' +
  '  const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);\n' +
  '  vec4 rgbaDepth = fract(gl_FragCoord.z * bitShift);\n' +
  '  rgbaDepth -= rgbaDepth.gbaa * bitMask;\n' +
  '  gl_FragColor = rgbaDepth;\n' + // Write the z-value in R
  '}\n';



//以下为正常的着色器

var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'vec3 lightDirection = vec3(-0.45, 0.9, 0.95);\n' +//灯光在这
  //'vec3 lightDirection = vec3(0.1, 0.4,0.35);\n' +
  'attribute vec4 a_Color;\n' +
  //纹理坐标
  'attribute vec2 a_TexCoord;\n' +
  'attribute vec4 a_Normal;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  //阴影
  'uniform mat4 u_MvpMatrixFromLight;\n' +
  'varying vec4 v_PositionFromLight;\n' +

  'uniform mat4 u_NormalMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'varying float vnDotL;\n' +
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_PositionFromLight = u_MvpMatrixFromLight * a_Position;\n' +
  '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  float nDotL = max(dot(normal, lightDirection), 0.0);\n' +
  //'  vnDotL = nDotL;\n' +
  '  v_Color = vec4(a_Color.rgb * nDotL, a_Color.a);\n' +
  '  v_TexCoord = a_TexCoord;' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'uniform sampler2D u_Sampler;' +//第一个取样器
  //取样器的判断
  'varying vec2 v_TexCoord;\n' +
  //阴影
  'uniform sampler2D u_ShadowMap;\n' +
  'varying vec4 v_PositionFromLight;\n' +
  'varying float vnDotL;\n' +
  'varying vec4 v_Color;\n' +
  //提高精度
  'float unpackDepth(const in vec4 rgbaDepth) {\n' +
  '  const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));\n' +
  '  float depth = dot(rgbaDepth, bitShift);\n' + // Use dot() since the calculations is same
  '  return depth;\n' +
  '}\n' +
  'void main() {\n' +
  '  vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;\n' +
  '  vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);\n' +
  '  float depth = unpackDepth(rgbaDepth);\n' + // Retrieve the z-value from R
  '  float visibility = (shadowCoord.z > depth + 0.0015) ? 0.7 : 1.0;\n' +
  //'gl_FragColor =vec4(texture2D(u_Sampler,v_TexCoord).rgb*vnDotL*visibility,1.0);' +
   '  gl_FragColor =vec4(v_Color.rgb*visibility,v_Color.a)* texture2D(u_Sampler,v_TexCoord);' +
  //'  gl_FragColor =vec4(v_Color.rgb*visibility,v_Color.a);' +
  //'  gl_FragColor = v_Color;\n' +
  '}\n';

var HUD_VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'attribute vec2 a_TexCoord;\n' +
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_TexCoord = a_TexCoord;\n' +
  '}\n';

var HUD_FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'uniform sampler2D u_Sampler;\n' +
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  //'  gl_FragColor = vec4(120,0.2,0.1,0.3); //texture2D(u_Sampler, v_TexCoord);\n' +
  //'  gl_FragColor =vec4(texture2D(u_Sampler, v_TexCoord).rgb,0.3);\n' +
  '  gl_FragColor =texture2D(u_Sampler, v_TexCoord);\n' +
  //'  gl_FragColor =texture2D(u_Sampler, v_TexCoord);\n' +
  '}\n';
var sphereobj=null;//球体对象-0
var arrowobj =null;//箭头对象-1
var stageobj =null;//墙和地板对象-2
var hudobj   =null;

var fs = wx.getFileSystemManager();
//全局文件管理器
var sounds = {};
sounds.Silent = true;
sounds.BGMvolume  = 0.3//可根据用户自定义调整BGM音量
var voice = wx.createInnerAudioContext();
voice.src = "resources/audio/BGM.mp3";
voice.loop = true
voice.volume = sounds.BGMvolume
voice.play()
sounds.BGM = voice;
sounds.turnswitch = function()
{
  if(this.Silent)//打开音效
  {
    this.BGM.volume = sounds.BGMvolume;
    this.Silent = false;
  }
  else
  {
    this.BGM.volume = 0;
    this.Silent = true;
  }
}

const Onlandaudio0 = wx.createInnerAudioContext();
Onlandaudio0.src = "resources/audio/onland0.mp3";
const Onlandaudio1 = wx.createInnerAudioContext();
Onlandaudio1.src = "resources/audio/onland1.mp3";
const Onlandaudio2 = wx.createInnerAudioContext();
Onlandaudio2.src = "resources/audio/onland2.mp3";
var onlandaudio = new Object(
  {
    play: function () {//是否全局静音判断
      if (sounds.Silent) return;
      console.log(this)
      switch (Math.floor(Math.random() * 3)) {
        case 0: Onlandaudio0.play(); break;
        case 1: Onlandaudio1.play(); break;
        case 2: Onlandaudio2.play(); break;
      }
    }

  })











var ready = false;

var drawingInfo = null;
//用于显示提示信息，和键盘按钮的平视显示器绘制canvas好高端啊
var HUD = null;
//包涵绘制信息，以及球体和钉的连接点。
var model=null
var init = function()
{
  web3d.giao()
 
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  prepareobjs(gl)
  //return
  if (!web3d.initShaders(gl, 'shadowprogram', SHADOW_VSHADER_SOURCE, SHADOW_FSHADER_SOURCE)) {
    console.log('阴影着色器初始化失败.');
    return;
  }
  if (!web3d.initShaders(gl, 'program', VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  if (!web3d.initShaders(gl, 'hudprogram', HUD_VSHADER_SOURCE, HUD_FSHADER_SOURCE)) {
    console.log('Failed to intialize hudshaders.');
    return;
  }
  gl.clearColor(0.2, 0.2, 0.2, 0.0);
  gl.enable(gl.DEPTH_TEST);
  var hudprogram = gl.hudprogram;
  hudprogram.a_Position = gl.getAttribLocation(hudprogram, 'a_Position');
  hudprogram.a_TexCoord = gl.getAttribLocation(hudprogram, 'a_TexCoord');
  hudprogram.u_MvpMatrix = gl.getUniformLocation(hudprogram, 'u_MvpMatrix');
  hudprogram.u_Sampler = gl.getUniformLocation(hudprogram, 'u_Sampler');



  // var texture = gl.createTexture();
  // gl.activeTexture(gl.TEXTURE2);
  // gl.bindTexture(gl.TEXTURE_2D, texture);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  // // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  // // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, HUDtex);
  // console.log('miao');
  

  var shadowprogram = gl.shadowprogram;
  shadowprogram.a_Position = gl.getAttribLocation(shadowprogram, 'a_Position');
  shadowprogram.u_MvpMatrix = gl.getUniformLocation(shadowprogram, 'u_MvpMatrix');
  if (shadowprogram.a_Position < 0 || !shadowprogram.u_MvpMatrix) {
    console.log('Failed to get the storage location of attribute or uniform variable from shadowProgram');
    return;
  }
  fbo = web3d.initFramebufferObject(gl, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);
  gl.activeTexture(gl.TEXTURE1); // Set a texture object to the texture unit
  gl.bindTexture(gl.TEXTURE_2D, fbo.texture);

  var program = gl.program;
  program.a_Position = gl.getAttribLocation(program, 'a_Position');
  program.a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord');
  program.a_Normal = gl.getAttribLocation(program, 'a_Normal');
  program.a_Color = gl.getAttribLocation(program, 'a_Color');
  program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix');
  program.u_NormalMatrix = gl.getUniformLocation(program, 'u_NormalMatrix');
  program.u_ShadowMap = gl.getUniformLocation(program, 'u_ShadowMap');
  program.u_MvpMatrixFromLight = gl.getUniformLocation(program, 'u_MvpMatrixFromLight');
  program.u_Sampler = gl.getUniformLocation(program, 'u_Sampler');

  if (program.a_Position < 0 || program.a_Normal < 0 || program.a_Color < 0 ||
    !program.u_MvpMatrix || !program.u_NormalMatrix < 0 || program.a_TexCoord < 0) {
    console.log('attribute, uniform変数の格納場所の取得に失敗');
    return ;
  }

  // Prepare empty buffer objects for vertex coordinates, colors, and normals
  model = initVertexBuffers(gl, program);
  if (!model) {
    console.log('Failed to set the vertex information');
    return;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, model.vtBuffer);
  gl.vertexAttribPointer(gl.hudprogram.a_TexCoord, 2, gl.FLOAT, false, 0, 0);  // Assign the buffer object to the attribute variable
  gl.enableVertexAttribArray(gl.hudprogram.a_TexCoord);



  var camera = new Cameralib.Camera(Sphere);//设置照相机
  HUD = new HUDlib.HUD(camera, Sphere, Arrowsonsphere,CWidth,CHeight);
  //HUD = new HUDlib.HUD(camera, Sphere);
  var touchlistener = new Touchlistener(camera);//设置监听事件
  wx.onTouchStart(touchlistener.Touchstart)
  wx.onTouchMove(touchlistener.Touchmove)
  wx.onTouchEnd(touchlistener.Touchend)

  var befordraw = setInterval(function () {//设置一个上限，当长期没有准备完成，进行二次请求，或者报错
    if (g_drawingInfo == null && isready()) {
      clearInterval(befordraw)
      g_drawingInfo = getInfo();
      gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, g_drawingInfo.vertices, gl.STATIC_DRAW);
      // gl.vertexAttribPointer(gl.hudprogram.a_Position, 3, gl.FLOAT,false, 0, 0);  // Assign the buffer object to the attribute variable
      // gl.enableVertexAttribArray(gl.hudprogram.a_Position);
      // gl.vertexAttribPointer(gl.shadowprogram.a_Position, 3, gl.FLOAT, false, 0, 0);  // Assign the buffer object to the attribute variable
      // gl.enableVertexAttribArray(gl.shadowprogram.a_Position);


      gl.bindBuffer(gl.ARRAY_BUFFER, model.vtBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, g_drawingInfo.vts, gl.STATIC_DRAW);

      // gl.vertexAttribPointer(gl.hudprogram.a_TexCoord, 2, gl.FLOAT, false, 0, 0);  // Assign the buffer object to the attribute variable
      // gl.enableVertexAttribArray(gl.hudprogram.a_TexCoord);

      gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, g_drawingInfo.normals, gl.STATIC_DRAW);

      gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, g_drawingInfo.colors, gl.STATIC_DRAW);
      // gl.vertexAttribPointer(gl.program.a_Color, 4, gl.FLOAT, false, 0, 0);  // Assign the buffer object to the attribute variable
      // gl.enableVertexAttribArray(gl.program.a_Color);

      
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g_drawingInfo.indices, gl.STATIC_DRAW);

      prepareTexture(gl, g_drawingInfo.tex)

      //是因为纹理对象必须顺序开启？把这段代码放到上面会bug。
      //为HUD准备tex
      HUD.initTexture(gl, 2, 0, 0,CWidth, CHeight);
      console.log('miao');

      gl.useProgram(gl.program)
      gl.uniform1i(gl.program.u_Sampler, 0);
      gl.uniform1i(gl.program.u_ShadowMap, 1);
      gl.useProgram(gl.hudprogram)
      gl.uniform1i(gl.hudprogram.u_Sampler,2)
      //对各个物体的indexes信息进行解包
      var objs = new Object();
      objs.stage = g_drawingInfo.indexes[2];
      objs.sphere = g_drawingInfo.indexes[0];
      objs.arrow = g_drawingInfo.indexes[1];
      objs.hud = g_drawingInfo.indexes[3];
      HUD.startup();
      var tick = function () {   // Start drawing
        if (camera.onMoving) {
          if (camera.Movingfront)
            camera.move(60)
          else
            camera.move(-60)
        }
        camera.rotate();
        draw(gl, gl.program, camera, model, objs);
        requestAnimationFrame(tick, canvas);
      };
      tick();
    }
  }, 500);
  return new Object({
    camera: camera ,
    arrowmanager: arrowmanager
     });
}
var cwidth = CWidth; var cheight = CHeight;
var fontsize = Math.floor((cwidth * cheight) / 10000);
//静音
var voicepos = { x: Math.floor(cwidth * 0.02), y: Math.floor(cheight * 0.21) }
//跟随
var followpos = { x: Math.floor(cwidth * 0.85), y: Math.floor(cheight * 0.55) }
//射击
var shootpos = { x: Math.floor(cwidth * 0.85), y: Math.floor(cheight * 0.85) }

var Touchlistener = function (camera) {
  

  this.camera = camera;
  this.lastX = 0.0;//触摸开始时候的点位置
  this.lastY = 0.0;
  this.OnRotate = false;
  this.Touchstart = function (res) {
    var x =this.lastX = res.touches[0].clientX;
    var y =this.lastY = res.touches[0].clientY;
    //暂封闭镜头的玩家控制
    //按照从左到右的顺序监听
    if (x < (cwidth/2))
    {
      if (x < (voicepos.x + fontsize * 6) && y < (voicepos.y + fontsize * 1.5))
      {console.log("turnon!")
        sounds.turnswitch();
      }
    }
    else
    {
      if (x < (followpos.x + fontsize * 3) && y < (followpos.y + fontsize * 1.5))
      {
        camera.changemode();
      }
      else if (x < (shootpos.x + fontsize * 3) && y < (shootpos.y + fontsize * 1.5))
      {
        var p = camera.Position.elements;
        var l = camera.Look.elements;
        arrowmanager.push(p[0], p[1]-1, p[2], l[0], l[1], l[2], 0, 0.5, true)
      }
    }
    // if(this.lastX>290&&this.lastX<360&&this.lastY>460&&this.lastY<500){
    //   // if(Arrowsonsphere.push(5,-0.5,1))console.log("shot!")
    //   // else console.log("Pow!miss")
    //   // return;
    //   var p = camera.Position.elements;
    //   var l = camera.Look.elements;
    //   arrowmanager.push(p[0], p[1]-1, p[2], l[0], l[1], l[2], 0, 0.5, true)//箭头在空间的位置，运动朝向，箭头类型，箭头是否运动中
    // } else if (this.lastX > 0 && this.lastX < 70 && this.lastY > 460 && this.lastY < 500){
    //   sounds.turnswitch();
    // } else if (this.lastX > 0 && this.lastX < 100 && this.lastY > 0 && this.lastY < 70)
    // {console.log("do!")
    //   camera.changemode();
    // }
    if (camera.follow)return;
    this.OnRotate = true;
  }
  this.Touchmove = function (res) {
    if (!this.OnRotate) return
    // camera.rotate(res.touches[0].clientX - this.lastX, res.touches[0].clientY - this.lastY);
    // this.lastX = res.touches[0].clientX;
    // this.lastY = res.touches[0].clientY;
    camera.rotateX += res.touches[0].clientX - this.lastX;
    camera.rotateY += res.touches[0].clientY - this.lastY;
    this.lastX = res.touches[0].clientX;
    this.lastY = res.touches[0].clientY;
  }
  this.Touchend = function (res) {
    camera.onMoving = false;
    this.OnRotate = false;
  }
}

//arrow的管理器，负责管理arrow的生成，销毁
//负责记录每个arrow的当前位置
//销毁方式，不消去对象，只是将其alive置false，然后initialize（实现方式？

var Arrowmanager =  function()
{
  var am = new Object();
  am.arrows = new Array();

  am.push = function(Postionx, Postiony,Postionz,Pointx,Pointy,Pointz,type,speed,moving)//箭头在空间的位置，运动朝向，箭头类型，箭头是否运动中
  {
    am.arrows.push(Arrow(Postionx, Postiony, Postionz, Pointx, Pointy, Pointz, type, speed, moving));
  }
  am.update = function(speed)//更新的速度，简单的乘？
  {
    for (var i = 0; i < this.arrows.length; i++) {var arrow = this.arrows[i];
      if(!arrow.alive)continue;
      if(!arrow.moving)continue;
      if(arrow.isout()){arrow.alive=false;continue;}
      if(arrow.isonland()){
        if (Arrowsonsphere.push(
          arrow.Postion.x - Sphere.Position.x,
          arrow.Postion.y - Sphere.Position.y,
          arrow.Postion.z - Sphere.Position.z))
        {//播放着陆音频
          onlandaudio.play();
        console.log("Onland!");} else console.log("Pow! missed!"); arrow.alive =false;continue;
        }
      arrow.Postion.x += speed * arrow.speed * arrow.Point.x;
      arrow.Postion.y += speed * arrow.speed * arrow.Point.y;
      arrow.Postion.z += speed * arrow.speed * arrow.Point.z;
      //console.log(arrow.Postion);
    }
  }
  am.cleanup = function()
  {
    am.arrows = new Array();//性能损耗？后面再说吧giao，先跑起来（doge
  }
  return am;
}
var Arrow = function (Postionx, Postiony, Postionz, Pointx, Pointy, Pointz, type, speed, moving)
{
  var P = new Object({ x: Postionx, y: Postiony, z: Postionz });
  return new Object(
  {
    Postion : P,
    Point   : { x: Pointx, y: Pointy, z: Pointz},
    speed   :speed,
    type    :type,
    moving  :moving,
    alive   :true,
    rotateM :new Matrix.Matrix4().rotateto(0,0,-1,Pointx, Pointy, Pointz),
    isout   :function()
    {
      if (P.x > 100 || P.x < -100|| P.y > 100 || P.y < -100 ||
        P.z > 100 || P.z<-100)return true; else return false;
    },
    isonland:function()
    {
      if (closeto(P.x, P.y, P.z, Sphere.Position.x, Sphere.Position.y, Sphere.Position.z, Sphere.Radius))return true;else return false;
    }
  });
}
var Sphere = new Object({
  Position : {x:0,y:3,z:5},//相对于基础位置的偏移相对位置，或者是绝对位置（当前不涉及sphere的位移
  Angle   : {x:0,y:0,z:0},//对应各个轴的旋转角度
  Radius  : 1,
  Speed   :2.5,
  Step    :0.01,
  Tempstep:0,
  Rotate  :{x:0,y:0.5,z:0},
  Turnaround:function()
  {
    this.Step=-this.Step;
  },
  Spin    :function()
  {
    if(this.Rotate.y!=0)
    {
      this.Angle.y = (this.Angle.y + this.Rotate.y * this.Speed);
      if(this.Angle.y>360)
      {
        this.Show();return true;
      }
      return false;
    }
    else
    {
      this.Angle.x = (this.Angle.x + this.Rotate.x * this.Speed);
      this.Angle.z = (this.Angle.z + this.Rotate.z * this.Speed);
      if(this.Angle.x>360||this.Angle.z>360)//show end
      {
        this.Angle.x = this.Angle.z = 0;
        this.Rotate.x = this.Rotate.z = 0;
        this.Rotate.y =0.5;
        this.Step = this.Tempstep;

      }
      return true;//doing show
    }
  },
  Show    :function()
  {
      this.Angle.y=0;this.Rotate.y=0;this.Tempstep = this.Step;this.Step=0;
      if(Math.random()*2<1)
      {
        this.Rotate.x = 0.8;
      }
      else
      {
        this.Rotate.z = 0.8;
      }

    
  },
  Move    :function()
  {
    return this.Position.x += this.Speed * this.Step;
  },
  Update  : function(speed)
  {//这个函数很重要，后续加上一定的随机性，模拟物理效果（加减速）
    var x = this.Move();
    if(this.Spin())return
    if (x > 7) this.Turnaround();//碰右壁
    else if (x < -7) this.Turnaround();//碰左壁
    //this.Angle.x = (this.Angle.x + this.Rotate.x * this.Speed) % 360;
    //this.Angle.y = (this.Angle.y + this.Rotate.y * this.Speed) % 360;
    //this.Angle.z = (this.Angle.z + this.Rotate.z * this.Speed) % 360;
  },
  RequestRM: function()
  {
    return new Matrix.Matrix4().translate(
      this.Position.x, this.Position.y, this.Position.z).rotate(
        Sphere.Angle.x, 1, 0, 0).rotate(
          Sphere.Angle.y, 0, 1, 0).rotate(
            Sphere.Angle.z, 0, 0, 1)
  },
  RequestURM: function () {
    //return new Matrix.Matrix4().rotate(Sphere.Angle.x, 1, 0, 0).rotate(-Sphere.Angle.y, 0, 1, 0).rotate(Sphere.Angle.z, 0, 0, 1)
    return new Matrix.Matrix4().rotate(-Sphere.Angle.z, 0, 0, 1).rotate(-Sphere.Angle.y, 0, 1, 0).rotate(-Sphere.Angle.x, 1, 0, 0)
  }
});
var Arrowsonsphere = new Object({
  arrows : new Array(),
  distance :0.15,
  push   : function(x,y,z)
  {
    var P = Sphere.RequestURM().multiplyVector3(new Matrix.Vector3([x, y, z]).normalize()).elements;
    for (var i =0;i<this.arrows.length;i++) {var arrow =this.arrows[i];continue//不作碰撞判断
      if (closeto(P[0], P[1], P[2], arrow.Position.x, arrow.Position.y, arrow.Position.z, this.distance)) return false;
    }
    this.arrows.push(Arrowonsphere(P));return true;
  }
}
)
var closeto = function (x1,y1,z1,x2,y2,z2,i)
{
  if (Math.sqrt(
    Math.pow((x1 - x2), 2)+
    Math.pow((y1 - y2), 2)+
    Math.pow((z1 - z2), 2))>i)return false ;else return true;
}
var Arrowonsphere = function(P)//对应的参数
{
  //初始化
  return new Object({
    Position : new Object({x:P[0],y:P[1],z:P[2]}),
    rotateM: new Matrix.Matrix4().rotateto(0, 0, 1, P[0], P[1], P[2]).translate(0, 0, 0.97)//半径
  });
}
// Create an buffer object and perform an initial configuration
function initVertexBuffers(gl, program) {
  var o = new Object(); // Utilize Object object to return multiple buffer objects
  o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT);
  o.vtBuffer = createEmptyArrayBuffer(gl, program.a_TexCoord, 2, gl.FLOAT);
  o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
  o.colorBuffer = createEmptyArrayBuffer(gl, program.a_Color, 4, gl.FLOAT);
  o.indexBuffer = gl.createBuffer();
  if (!o.vertexBuffer || !o.normalBuffer || !o.colorBuffer || !o.indexBuffer || !o.vtBuffer) { return null; }
  //gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return o;
}

// Create a buffer object, assign it to attribute variables, and enable the assignment
function createEmptyArrayBuffer(gl, a_attribute, num, type) {
  var buffer = gl.createBuffer();  // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);  // Assign the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);  // Enable the assignment

  return buffer;
}
var g_objDoc = null;      // The information of OBJ file
var g_drawingInfo = null; // The information for drawing 3D mode

// Coordinate transformation matrix
var g_modelMatrix = new Matrix.Matrix4();
var g_mvpMatrix = new Matrix.Matrix4();
var g_normalMatrix = new Matrix.Matrix4();

//阴影矩阵mvp fromlight
var mvpMatrixFromLight_stage = new Matrix.Matrix4();
var mvpMatrixFromLight_sphere = new Matrix.Matrix4();

var viewProjMatrixFromLight = new Matrix.Matrix4(); // Prepare a view projection matrix for generating a shadow map
viewProjMatrixFromLight.setPerspective(70.0, OFFSCREEN_WIDTH / OFFSCREEN_HEIGHT, 1.0, 1000.0);
viewProjMatrixFromLight.lookAt(LIGHT_X, LIGHT_Y, LIGHT_Z, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
// 描画関数//从加载完成的函数里跳转绘制函数  省去每次的判断，提高效率
var arrowsMMFA = new Array();//mvpmatrixfromlightarray
var arrowsonsphereMMFA  =new Array();
//arrow管理器
var arrowmanager = Arrowmanager();
var arrows = arrowmanager.arrows;
var arrowsonsphere = Arrowsonsphere.arrows;
//var tempmodelM = null;

function draw(gl, program, camera, model, objs) {
  

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);               // Change the drawing destination to FBO
  gl.viewport(0, 0, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT); // Set view port for FBO
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  var program = gl.shadowprogram;
  gl.useProgram(program);
  // gl.bindBuffer(gl.ARRAY_BUFFER, program.Buffer.vertexBuffer);
  // gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0, 0);
  // gl.enableVertexAttribArray(program.a_Position);
  // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, program.Buffer.indexBuffer);


  //在此处进行绘制arrow，记录在一个对象中，记录各个arrow的位置（相对墙面的位置，相对球的位置（空间位置，相对球心的位置计算得出？））。



  g_modelMatrix.setIdentity();
  g_mvpMatrix.set(viewProjMatrixFromLight);
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
  //绘制舞台
  gl.drawArrays(gl.TRIANGLES, objs.stage.index, objs.stage.length);
  mvpMatrixFromLight_stage.set(g_mvpMatrix);

  //g_modelMatrix.translate(0, 2, 4);
  var SphereRM = Sphere.RequestRM()
  g_modelMatrix.multiply(SphereRM);
  g_mvpMatrix.set(viewProjMatrixFromLight);
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
  //绘制球体
  gl.drawArrays(gl.TRIANGLES, objs.sphere.index, objs.sphere.length);
  mvpMatrixFromLight_sphere.set(g_mvpMatrix);
  //绘制arrowsonsphere
  var temp = new Matrix.Matrix4(g_modelMatrix);
  for (var i =0;i<arrowsonsphere.length;i++) {var arrow =arrowsonsphere[i];
    g_modelMatrix.set(temp);
    g_modelMatrix.multiply(arrow.rotateM)
    g_mvpMatrix.set(viewProjMatrixFromLight)
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, objs.arrow.index, objs.arrow.length);
    arrowsonsphereMMFA.push(new Matrix.Matrix4(g_mvpMatrix))
  }
  // g_modelMatrix.multiply(new Matrix.Matrix4().rotateto(0, 0, 1, 1, 0, 0))
  // g_modelMatrix.translate(0, 0, 0.9);
  // g_mvpMatrix.set(viewProjMatrixFromLight)
  // g_mvpMatrix.multiply(g_modelMatrix);
  // gl.uniformMatrixc4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
  // gl.drawArrays(gl.TRIANGLES, objs.arrow.index, objs.arrow.length);
  // arrowsonsphereMMFA.push(new Matrix.Matrix4(g_mvpMatrix))


  //测试绘制arrow
  for (var i =0;i<arrows.length;i++) {var arrow =arrows[i];if(!arrow.alive) continue;
    g_modelMatrix.setTranslate(arrow.Postion.x, arrow.Postion.y, arrow.Postion.z);
    g_modelMatrix.multiply(arrow.rotateM);
    g_mvpMatrix.set(viewProjMatrixFromLight);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, objs.arrow.index, objs.arrow.length);
    arrowsMMFA.push(new Matrix.Matrix4(g_mvpMatrix))
  }


  gl.bindFramebuffer(gl.FRAMEBUFFER, null);               // Change the drawing destination to color buffer
  gl.viewport(0, 0, CWidth, CHeight);
  program = gl.program;
  gl.useProgram(program);
  // gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
  // gl.vertexAttribPointer(model.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
  // gl.enableVertexAttribArray(program.a_Position);
  // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
  gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
  gl.vertexAttribPointer(gl.program.a_Color, 4, gl.FLOAT, false, 0, 0);  // Assign the buffer object to the attribute variable
  gl.enableVertexAttribArray(gl.program.a_Color);



  //正常的绘制
  gl.clearColor(0.2, 0.2, 0.2, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  // Clear color and depth buffers

  g_modelMatrix.setIdentity();
  // g_modelMatrix.setRotate(angle, 1.0, 0.0, 0.0); // 適当に回転
  // g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);
  // g_modelMatrix.rotate(angle, 0.0, 0.0, 1.0);
  var viewProjMatrix = camera.getViewM();

  // Calculate the model view project matrix and pass it to u_MvpMatrix
  //g_mvpMatrix.set(viewProjMatrix);getViewM
  g_mvpMatrix.set(viewProjMatrix)
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
  gl.uniformMatrix4fv(program.u_MvpMatrixFromLight, false, mvpMatrixFromLight_stage.elements);
  //绘制舞台
  gl.drawArrays(gl.TRIANGLES, objs.stage.index, objs.stage.length);

  //g_modelMatrix.translate(0, 2, 4);
  g_modelMatrix.multiply(SphereRM);
  g_mvpMatrix.set(viewProjMatrix)
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
  gl.uniformMatrix4fv(program.u_MvpMatrixFromLight, false, mvpMatrixFromLight_sphere.elements);
  g_normalMatrix.setInverseOf(g_modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);
  //绘制球体
  
  gl.drawArrays(gl.TRIANGLES, objs.sphere.index, objs.sphere.length);
  
  
  //绘制arrowsonsphere
  temp = new Matrix.Matrix4(g_modelMatrix);
  for (var i =0;i<arrowsonsphere.length;i++) {var arrow =arrowsonsphere[i];
    g_modelMatrix.set(temp);
    g_modelMatrix.multiply(arrow.rotateM)
    g_mvpMatrix.set(viewProjMatrix)
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_MvpMatrixFromLight, false, arrowsonsphereMMFA.pop().elements);
    gl.drawArrays(gl.TRIANGLES, objs.arrow.index, objs.arrow.length);
  }
  




  g_modelMatrix.setIdentity();
  // Calculate the normal transformation matrix and pass it to u_NormalMatrix
  g_normalMatrix.setInverseOf(g_modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);

  for (var i = 0; i < arrows.length; i++) {var arrow = arrows[i];if (!arrow.alive) continue;
    g_modelMatrix.setTranslate(arrow.Postion.x, arrow.Postion.y, arrow.Postion.z);
    g_modelMatrix.multiply(arrow.rotateM);
    g_mvpMatrix.set(viewProjMatrix);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_MvpMatrixFromLight, false, arrowsMMFA.pop().elements);
    gl.drawArrays(gl.TRIANGLES, objs.arrow.index, objs.arrow.length);

  }
  program = gl.hudprogram;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, model.vtBuffer);
  gl.vertexAttribPointer(gl.hudprogram.a_TexCoord, 2, gl.FLOAT, false, 0, 0);  // Assign the buffer object to the attribute variable
  gl.enableVertexAttribArray(gl.hudprogram.a_TexCoord);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, camera.getHUDviewM().elements);
  gl.drawArrays(gl.TRIANGLES, objs.hud.index, objs.hud.length);
  gl.disable(gl.BLEND)





  HUD.requestupdate(gl);
  arrowmanager.update(1);
  Sphere.Update(1);

}
function prepareTexture(gl, tex) {
  //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  var texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex);

}
var prepareobjs = function(gl)
{
  gl=gl;
  var model = 0;
  // readOBJFile('http://localhost:8080/3D/sphere/sphere-middle.obj', gl, model, 1, true,0);
  // readOBJFile('http://localhost:8080/3D/arrow/arrow.obj', gl, model, 1, true, 1);
  // readOBJFile('https://ducksaywhat.com/3D/resources/sphere/sphere-middle.obj', gl, model, 1, true, 0);
  // readOBJFile('https://ducksaywhat.com/3D/resources/arrow/arrow.obj', gl, model, 1s, true, 1);
  // readOBJFile('resources/sphere/sphere1-2.obj', gl, model, 0.1, true, 0);
  readOBJFile('resources/sphere/jh001.obj', gl, model, 0.016, true, 0);
  //readOBJFile('resources/arrow/arrow1-2.obj', gl, model, 0.1, true, 1);
  readOBJFile('resources/arrow/hair007.obj', gl, model, 0.016, true, 1);
  readOBJFile('resources/stage/stage1-1.obj', gl, model, 10, true, 2);
  readOBJFile('resources/HUD/HUD.obj', gl, model, 1, true, 3);
  var id = setInterval(function(){//设置一个上限，当长期没有准备完成，进行二次请求，或者报错
      //console.log("!")
      if (stageobj != null && stageobj.isMTLComplete())
      if (sphereobj != null && sphereobj.isMTLComplete()) // SphereOBJ is available
      if (arrowobj != null && arrowobj.isMTLComplete())
      if (hudobj != null && hudobj.isMTLComplete()) { // ArrowOBJ is available too
          var objs = new Array();
          //因为游戏内容简单，游戏内模型组件固定，所以用顺序填充，顺序处理
          objs.push(sphereobj);
          objs.push(arrowobj);
          objs.push(stageobj);
          objs.push(hudobj);
          //加入墙体地面(舞台：stage)的obj
          drawingInfo = getDrawingInfo(objs);
          drawingInfo.tex = new Image()
          drawingInfo.tex.onload = function()
          {
            ready = true;
          }
          drawingInfo.tex.src='resources/tex1-6.jpg'
           clearInterval(id)
        }
      
    
  }
  ,500)
}
var t=0;
function getDrawingInfo(objs)
{
  var numIndices = 0;
  var textures = new Array(0);
  var indexes = new Array();
  for(var i = 0;i<objs.length;i++)
  {
    for (var j = 0; j < objs[i].mtls.length; j++) 
    {
      //console.log(objs[i].mtls[j].materials.length);
      for (var k = 0; k < objs[i].mtls[j].materials.length; k++) 
      {
        //console.log(objs[i].mtls[j].materials[j])
        textures.push(objs[i].mtls[j].materials[k].tex)
      }
    }
    for (var j = 0; j < objs[i].objects.length;j++)
    {
      //console.log(objs[i].objects[j].numIndices)
      indexes.push(new Object({ index: parseInt(numIndices), length: objs[i].objects[j].numIndices}))
      numIndices += objs[i].objects[j].numIndices;
    }
  }
    var numVertices = numIndices;
    var vertices = new Float32Array(numVertices * 3);
    var normals = new Float32Array(numVertices * 3);
    var colors = new Float32Array(numVertices * 4);
    var indices = new Uint16Array(numIndices);
    var vts = new Float32Array(numVertices * 2)



    var index_indices = 0;
    for(var o = 0;o<objs.length;o++)
    {
      for (var i = 0; i < objs[o].objects.length; i++) 
      {
        var object = objs[o].objects[i];
        for (var j = 0; j < object.faces.length; j++) 
        {
          var face = object.faces[j];
          //console.log(face.materialName);
          var material = objs[o].findColor(face.materialName);
          //console.log(material)
          var color = material.color;
          //var texid = (material.tex.id) - 1;
          //console.log(texid)
          //console.log(color);
          var faceNormal = face.normal;
          for (var k = 0; k < face.vIndices.length; k++) {
            // Set index
            indices[index_indices] = index_indices;
            // Copy vertex
            var vIdx = face.vIndices[k];
            var vertex = objs[o].vertices[vIdx];
            //console.log(face.vIndices.length)
            vertices[index_indices * 3 + 0] = vertex.x;
            vertices[index_indices * 3 + 1] = vertex.y;
            vertices[index_indices * 3 + 2] = vertex.z;
            // Copy color
            colors[index_indices * 4 + 0] = color.r;
            colors[index_indices * 4 + 1] = color.g;
            colors[index_indices * 4 + 2] = color.b;
            colors[index_indices * 4 + 3] = color.a;
            // Copy normal
            var nIdx = face.nIndices[k];
            if (nIdx >= 0) {
              var normal = objs[o].normals[nIdx];
              //console.log(normal)
              normals[index_indices * 3 + 0] = normal.x;
              normals[index_indices * 3 + 1] = normal.y;
              normals[index_indices * 3 + 2] = normal.z;
            } else {
              //console.log("i'm here!")
              normals[index_indices * 3 + 0] = faceNormal.x;
              normals[index_indices * 3 + 1] = faceNormal.y;
              normals[index_indices * 3 + 2] = faceNormal.z;
            }
            var vtIdx = face.vtIndices[k];
            //之前命名有点捞....
            var vt = objs[o].VT[vtIdx];
            //因为3Dmax不支持部分的纹理图像导出，所以在这里对纹理图像进行剪裁计算。因为只有两个
            //物体的tex，所以处理起来比较容易。
            //2018.11.25变成了四块纹理，重写
            //console.log(objs[o].VT)
            //vts[index_indices * 2 + 0] = vt.x*0.4+0.001;
            vts[index_indices * 2 + 0] = calculatetexx(vt.x, t)
            //vts[index_indices * 2 + 0] =0.002//我靠！无意中发现可以用随机数生成随机土星球！！！！！爱上了（笔芯♥
            //console.log(vt.x);
            vts[index_indices * 2 + 1] =  calculatetexy(vt.y,t) //vt.y*0.5
            //console.log(texid)
            //console.log(texid);
            index_indices++;
          }
        }
      }
      t++;
      
    }
    return new DrawingInfo(vertices, normals, colors, vts, indices, textures,indexes); 
}
var n = Math.random() * 0.45;
function calculatetexx(tx,i)
{
  if(i==0)//第一个物体的纹理
  {
    //生成随机数就完事了嗷
    tx = Math.random()*0.45//又无意发现.....每个顶点随机数后出现超均匀地粒子效果亮晶晶球体...我这个bug王....
    //tx=n;//这个是土星效果
  }
  else if(i==1)//
  {
    // t+=1;
    // t*=0.5;
    // if(t<0.5)t+=0.001
    // else if(t>1)t-=0.001
    //t =0.5+0.5*Math.random()-0.001;
    tx = 0.5 +tx*0.5;
    //if(tx>=1.0)tx=0.99
  }
  return tx
  //此处不return 会有土星奇观（狗头
}
function calculatetexy(ty, i) 
{
  if(i==0)
  {
  ty*=0.5
  // if(ty>=0.499)ty=0.499
  // else
  // if(ty<=0.001)ty=0.001;
  //console.log(ty)
  }
  else if(i==1)
  {
    //ty*=0.5
    ty = 0.2// * Math.random()
  }
  return ty
}
// Read a file
function readOBJFile(fileName, gl, model, scale, reverse,flag) {
  // var request = new XMLHttpRequest();
  // request.onreadystatechange = function () {
  //   if (request.readyState === 4 && request.status !== 404) {
  //     onReadOBJFile(request.responseText, fileName, gl, model, scale, reverse, flag);
  //   }
  // }
  // request.open('GET', fileName, true); // Create a request to acquire the file
  // request.send();                      // Send the request
  fs.readFile(
    {
      filePath: fileName,
      encoding: 'ascii',
      success:(res)=>
      {
        //console.log(res)
        onReadOBJFile(res.data, fileName, gl, model, scale, reverse, flag);
      },
      fail:(err)=>
      {
        console.log(err)
      }
    }
  )

}

//var g_objDoc = null;      // The information of OBJ file
//var g_drawingInfo = null; // The information for drawing 3D model

// OBJ File has been read
function onReadOBJFile(fileString, fileName, gl, o, scale, reverse, flag) {
  var objDoc = new OBJDoc(fileName);  // Create a OBJDoc object
  var result = objDoc.parse(fileString, scale, reverse); // Parse the file
  //console.log(objDoc)
  if (!result) {
    g_objDoc = null; g_drawingInfo = null;
    console.log("OBJ file parsing error.");
    return;
  }
  if(flag==0)
  {
    sphereobj=objDoc;
  }
  else if(flag==1)
  {
    arrowobj=objDoc;
  }
  else if(flag==2)
  {
    stageobj=objDoc;
  }
  else if(flag==3) 
  {
    hudobj = objDoc;
  }
  //g_objDoc = objDoc;
}
// OBJDoc object
// Constructor
var OBJDoc = function (fileName) {
  this.fileName = fileName;
  this.mtls = new Array(0);      // Initialize the property for MTL
  this.objects = new Array(0);   // Initialize the property for Object
  this.vertices = new Array(0);  // Initialize the property for Vertex
  this.normals = new Array(0);   // Initialize the property for Normal
  //以下为拓展（理解为plus可还行
  this.VT = new Array(0);//纹理坐标
}

// Parsing the OBJ file
OBJDoc.prototype.parse = function (fileString, scale, reverse) {
  var lines = fileString.split('\n');  // Break up into lines and store them as array
  lines.push(null); // Append null
  var index = 0;    // Initialize index of line

  var currentObject = null;
  var currentMaterialName = "";

  // Parse line by line
  var line;         // A string in the line to be parsed
  var sp = new StringParser();  // Create StringParser
  while ((line = lines[index++]) != null) {
    sp.init(line);                  // init StringParser
    var command = sp.getWord();     // Get command
    if (command == null) continue;  // check null command

    switch (command) {
      case '#':
        continue;  // Skip comments
      case 'mtllib':     // Read Material chunk
        //console.log("i'm parsing a mtl!!!!!!")
        var path = (this.parseMtllib(sp, this.fileName)).trim();
        var mtl = new MTLDoc();   // Create MTL instance
        this.mtls.push(mtl);
        fs.readFile(
          {
            filePath: path,
            encoding: 'ascii',
            success: (res) => {
              //console.log(res)
              onReadMTLFile(res.data, mtl, path);
            },
            fail: (err) => {
              console.log(err)
            }
          }
        )
        continue; // Go to the next line
      case 'o':continue;
      case 'g':   // Read Object name
        var object = this.parseObjectName(sp);
        this.objects.push(object);
        currentObject = object;
        continue; // Go to the next line
      case 'v':   // Read vertex
        var vertex = this.parseVertex(sp, scale);
        this.vertices.push(vertex);
        continue; // Go to the next line
      case 'vn':   // Read normal
        var normal = this.parseNormal(sp);
        this.normals.push(normal);
        continue; // Go to the next line
        continue;
      case 'vt':  //贴图坐标
        var vt = this.parseVT(sp);
        this.VT.push(vt);
        continue;
      case 'usemtl': // Read Material name
        currentMaterialName = this.parseUsemtl(sp).trim();
        continue; // Go to the next line
      case 'f': // Read face
        var face = this.parseFace(sp, currentMaterialName, this.vertices, reverse);
        //console.log(face)
        currentObject.addFace(face);
        continue; // Go to the next line
      default: continue;
    }
  }

  return true;
}

OBJDoc.prototype.parseMtllib = function (sp, fileName) {
  // Get directory path
  var i = fileName.lastIndexOf("/");
  var dirPath = "";
  if (i > 0) dirPath = fileName.substr(0, i + 1);
  return dirPath + sp.getWord();   // Get path

}

OBJDoc.prototype.parseObjectName = function (sp) {
  var name = sp.getWord();
  return (new OBJObject(name));
}

OBJDoc.prototype.parseVertex = function (sp, scale) {
  var x = sp.getFloat() * scale;
  var y = sp.getFloat() * scale;
  var z = sp.getFloat() * scale;
  return (new Vertex(x, y, z));
}
//拓展： 解析定点贴图坐标Texture vertices
OBJDoc.prototype.parseVT = function (sp) {
  var x = sp.getFloat();
  //console.log(x);
  var y = sp.getFloat();
  //console.log(y);
  return (new VT(x, y));
}
OBJDoc.prototype.parseNormal = function (sp) {
  var x = sp.getFloat();
  var y = sp.getFloat();
  var z = sp.getFloat();
  return (new Normal(x, y, z));
}

OBJDoc.prototype.parseUsemtl = function (sp) {
  return sp.getWord();
}
//新版本 需要修改这个函数
OBJDoc.prototype.parseFace = function (sp, materialName, vertices, reverse) {
  var face = new Face(materialName);
  // get indices
  for (; ;) {
    var word = sp.getWord().trim();

    if (word == null) break;
    if (word == "") break;
    //word = word.trim();
    //console.log("Word:"+word+".")
    var subWords = word.split('/');

    if (subWords.length >= 1) {
      var vi = parseInt(subWords[0]) - 1;
      face.vIndices.push(vi);
    }
    if (subWords.length >= 3) {//包含纹理坐标，面法线信息
      var ni = parseInt(subWords[2]) - 1;
      face.nIndices.push(ni);
      var vti = parseInt(subWords[1]) - 1;
      face.vtIndices.push(vti);
    }
    else {
      face.nIndices.push(-1);
    }
  }

  // calc normal
  var v0 = [
    vertices[face.vIndices[0]].x,
    vertices[face.vIndices[0]].y,
    vertices[face.vIndices[0]].z];
  var v1 = [
    vertices[face.vIndices[1]].x,
    vertices[face.vIndices[1]].y,
    vertices[face.vIndices[1]].z];
  var v2 = [
    vertices[face.vIndices[2]].x,
    vertices[face.vIndices[2]].y,
    vertices[face.vIndices[2]].z];

  // 面の法線を計算してnormalに設定
  var normal = calcNormal(v0, v1, v2);
  // 法線が正しく求められたか調べる
  if (normal == null) {
    if (face.vIndices.length >= 4) { // 面が四角形なら別の3点の組み合わせで法線計算
      var v3 = [
        vertices[face.vIndices[3]].x,
        vertices[face.vIndices[3]].y,
        vertices[face.vIndices[3]].z];
      normal = calcNormal(v1, v2, v3);
    }
    if (normal == null) {         // 法線が求められなかったのでY軸方向の法線とする
      normal = [0.0, 1.0, 0.0];
    }
  }
  if (reverse) {
    normal[0] = -normal[0];
    normal[1] = -normal[1];
    normal[2] = -normal[2];
  }
  face.normal = new Normal(normal[0], normal[1], normal[2]);

  // Devide to triangles if face contains over 3 points.
  if (face.vIndices.length > 3) {
    var n = face.vIndices.length - 2;
    var newVIndices = new Array(n * 3);
    var newNIndices = new Array(n * 3);
    //现在导出的模型都是三角形面片的，但是谁知道以后呢是吧
    //姑且装模作样的整上就完事了嗷铁汁
    var newVTIndices = new Array(n * 3)
    for (var i = 0; i < n; i++) {
      //console.log("giao")
      newVIndices[i * 3 + 0] = face.vIndices[0];
      newVIndices[i * 3 + 1] = face.vIndices[i + 1];
      newVIndices[i * 3 + 2] = face.vIndices[i + 2];
      newNIndices[i * 3 + 0] = face.nIndices[0];
      newNIndices[i * 3 + 1] = face.nIndices[i + 1];
      newNIndices[i * 3 + 2] = face.nIndices[i + 2];
      newVTIndices[i * 3 + 0] = face.vtIndices[0];
      newVTIndices[i * 3 + 1] = face.vtIndices[i + 1];
      newVTIndices[i * 3 + 2] = face.vtIndices[i + 2];
    }
    face.vIndices = newVIndices;
    face.nIndices = newNIndices;
    face.vtIndices = newVTIndices;
  }
  face.numIndices = face.vIndices.length;

  return face;
}

// Analyze the material file
function onReadMTLFile(fileString, mtl, filename) {
  //console.log(filename);
  var lines = fileString.split('\n');  // Break up into lines and store them as array
  lines.push(null);           // Append null
  var index = 0;              // Initialize index of line

  // Parse line by line
  var line;      // A string in the line to be parsed
  var name = ""; // Material name
  var sp = new StringParser();  // Create StringParser
  var material;
  while ((line = lines[index++]) != null) {
    sp.init(line);                  // init StringParser
    var command = sp.getWord();     // Get command
    if (command == null) continue;  // check null command


    switch (command) {
      case '#':
        continue;    // Skip comments
      case 'newmtl': // Read Material chunk
        material = null;
        name = mtl.parseNewmtl(sp).trim();    // Get name
        continue; // Go to the next line
      case 'Kd':   // Read normal
        if (name == "") continue; // Go to the next line because of Error
        material = mtl.parseRGB(sp, name);
        mtl.materials.push(material);
        //console.log(material)
        //name = "";
        continue; // Go to the next line
        name = "";
        continue;
      default: continue;
    }
  }
  mtl.complete = true;
}
// Check Materials
OBJDoc.prototype.isMTLComplete = function () {
  if (this.mtls.length == 0) return true;
  for (var i = 0; i < this.mtls.length; i++) {
    if (!this.mtls[i].complete) return false;
  }
  return true;
}

// Find color by material name
OBJDoc.prototype.findColor = function (name) {
  //console.log("0-0" + this.mtls.length)
  for (var i = 0; i < this.mtls.length; i++) {
    //console.log(this.mtls[i].materials.length)
    for (var j = 0; j < this.mtls[i].materials.length; j++) {
      //console.log(this.mtls[i].materials[j].name);
      //console.log("A:" + this.mtls[i].materials[j].name + "B:" + name);
      if (this.mtls[i].materials[j].name == name) {
        //console.log(this.mtls[i].materials[j].color);
        //console.log(this.mtls[i].materials[j]);
        return (this.mtls[i].materials[j])
      }
    }
  }
  return (new Color(0.9, 0.8, 0.8, 1));
}

//------------------------------------------------------------------------------
// Retrieve the information for drawing 3D model
OBJDoc.prototype.getDrawingInfo = function () {
  //console.log("i'm doing!")
  // Create an arrays for vertex coordinates, normals, colors, and indices
  //console.log(typeof (this.mtls));
  //console.log(this.mtls instanceof Array);
  //console.log(typeof(this.mtls[0].materials));
  //console.log(this.mtls[0].materials instanceof Array);
  //console.log(this.mtls[0].materials);
  var numIndices = 0;
  for (var i = 0; i < this.objects.length; i++) {
    numIndices += this.objects[i].numIndices;
  }
  var numVertices = numIndices;
  var vertices = new Float32Array(numVertices * 3);
  var normals = new Float32Array(numVertices * 3);
  var colors = new Float32Array(numVertices * 4);
  var indices = new Uint16Array(numIndices);
  // var vertices = new Float32Array();
  // var normals = new Float32Array();
  // var colors = new Float32Array();
  // var indices = new Uint16Array();

  var vts = new Float32Array(numVertices * 2)
  var textures = new Array(0);
  for (var i = 0; i < this.mtls.length; i++) {
    //console.log(this.mtls[i].materials.length);
    for (var j = 0; j < this.mtls[i].materials.length; j++) {
      //console.log(this.mtls[i].materials[j])
      textures.push(this.mtls[i].materials[j].tex)
    }
  }
  //console.log(textures)
  // Set vertex, normal and color
  //现加入纹理坐标 2018/10/19
  var index_indices = 0;
  for (var i = 0; i < this.objects.length; i++) {
    var object = this.objects[i];
    for (var j = 0; j < object.faces.length; j++) {
      var face = object.faces[j];
      //console.log(face.materialName);
      var material = this.findColor(face.materialName);
      //console.log(material)
      var color = material.color;
      var texid = (material.tex.id) - 1;
      //console.log(texid)
      //console.log(color);
      var faceNormal = face.normal;
      for (var k = 0; k < face.vIndices.length; k++) {
        // Set index
        indices[index_indices] = index_indices;
        // Copy vertex
        var vIdx = face.vIndices[k];
        var vertex = this.vertices[vIdx];
        //console.log(face.vIndices.length)
        vertices[index_indices * 3 + 0] = vertex.x;
        vertices[index_indices * 3 + 1] = vertex.y;
        vertices[index_indices * 3 + 2] = vertex.z;
        // Copy color
        colors[index_indices * 4 + 0] = color.r;
        colors[index_indices * 4 + 1] = color.g;
        colors[index_indices * 4 + 2] = color.b;
        colors[index_indices * 4 + 3] = color.a;
        // Copy normal
        var nIdx = face.nIndices[k];
        if (nIdx >= 0) {
          var normal = this.normals[nIdx];
          //console.log(normal)
          normals[index_indices * 3 + 0] = normal.x;
          normals[index_indices * 3 + 1] = normal.y;
          normals[index_indices * 3 + 2] = normal.z;
        } else {
          //console.log("i'm here!")
          normals[index_indices * 3 + 0] = faceNormal.x;
          normals[index_indices * 3 + 1] = faceNormal.y;
          normals[index_indices * 3 + 2] = faceNormal.z;
        }
        var vtIdx = face.vtIndices[k];
        //之前命名有点捞....
        var vt = this.VT[vtIdx];
        //console.log(this.VT)
        vts[index_indices * 2 + 0] = vt.x;
        //console.log(vt.x);
        vts[index_indices * 2 + 1] = vt.y;
        //console.log(texid)
        //console.log(texid);
        index_indices++;
      }
    }
  }
  //console.log(vts)
  return new DrawingInfo(vertices, normals, colors, vts, indices, textures);
}

//--------------------------------------------------------------------Material----------
// MTLDoc Object
//------------------------------------------------------------------------------
var MTLDoc = function () {
  this.complete = false; // MTL is configured correctly//旧版本//2018.10.29又回到原点（重启用
  this.loadcomplete = false//文件解析完毕，但是具体的纹理图像加载位置
  this.materials = [] //new Array(0);
  //this.texs = new Array(0);
  this.iscomplete = function () {
    if (!this.loadcomplete) return false;
    for (var i = 0; i < this.materials.length; i++) {
      if (!this.materials[i].tex.complete) return false;
    }
    this.complete = true;
    return true;
  }
}

MTLDoc.prototype.parseNewmtl = function (sp) {
  return sp.getWord();         // Get name
}

MTLDoc.prototype.parseRGB = function (sp, name) {
  var r = sp.getFloat();
  var g = sp.getFloat();
  var b = sp.getFloat();
  //console.log("R:"+r+"G:"+g+"B:"+b);
  return (new Material(name, r, g, b, 1));
}

// MTLDoc.prototype.parseTex = function (sp, filename) {
//   var tex = Object();
//   tex.complete = false
//   tex.id = this.materials.length;
//   //console.log(tex.id);
//   //tex.isnotcomplete=true;
//   tex.source = sp.getWord();
//   tex.img = new Image();
//   //方便?????兼容没有贴图的情况
//   tex.img.onload = function () {tex.complete = true; };
//   var i = filename.lastIndexOf("/");
//   var dirPath = "";
//   if (i > 0) dirPath = filename.substr(0, i);
//   var src = dirPath + '/'+tex.source.substr(2, tex.source.length - 1);
//   //console.log("asdasdasdsa:"+src)
//   tex.img.src = src.trim();
//   return tex;
// }

//------------------------------------------------------------------------------
// Material Object
//------------------------------------------------------------------------------
var Material = function (name, r, g, b, a) {
  //this.complete=false;
  this.name = name;
  this.color = new Color(r, g, b, a);
}

//------------------------------------------------------------------------------
// Vertex Object
//------------------------------------------------------------------------------
var Vertex = function (x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}

var VT = function (x, y) {
  this.x = x;
  this.y = y;
}

//------------------------------------------------------------------------------
// Normal Object
//------------------------------------------------------------------------------
var Normal = function (x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}

//------------------------------------------------------------------------------
// Color Object
//------------------------------------------------------------------------------
var Color = function (r, g, b, a) {
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = a;
}

//------------------------------------------------------------------------------
// OBJObject Object
//------------------------------------------------------------------------------
var OBJObject = function (name) {
  this.name = name;
  this.faces = new Array(0);
  this.numIndices = 0;
}

OBJObject.prototype.addFace = function (face) {
  this.faces.push(face);
  this.numIndices += face.numIndices;
}

//------------------------------------------------------------------------------
// Face Object
//------------------------------------------------------------------------------
var Face = function (materialName) {
  this.materialName = materialName;
  if (materialName == null) this.materialName = "";
  this.vIndices = new Array(0);
  this.nIndices = new Array(0);
  //纹理坐标
  this.vtIndices = new Array(0);
}

//------------------------------------------------------------------------------
// DrawInfo Object
//------------------------------------------------------------------------------
var DrawingInfo = function (vertices, normals, colors, vts, indices, textures,indexes) {
  this.vertices = vertices;
  this.normals = normals;
  this.colors = colors;
  this.indices = indices;
  this.vts = vts;
  this.textures = textures;
  this.indexes  =indexes;

}

//------------------------------------------------------------------------------
// Constructor
var StringParser = function (str) {
  this.str;   // Store the string specified by the argument
  this.index; // Position in the string to be processed
  this.init(str);
}
// Initialize StringParser object
StringParser.prototype.init = function (str) {
  this.str = str;
  this.index = 0;
}

// Skip delimiters
StringParser.prototype.skipDelimiters = function () {
  for (var i = this.index, len = this.str.length; i < len; i++) {
    var c = this.str.charAt(i);
    // Skip TAB, Space, '(', ')
    if (c == '\t' || c == ' '|| c == '(' || c == ')' || c == '"') continue;
    break;
  }
  this.index = i;
}

// Skip to the next word
StringParser.prototype.skipToNextWord = function () {
  this.skipDelimiters();
  var n = getWordLength(this.str, this.index);
  this.index += (n + 1);
}

// Get word
StringParser.prototype.getWord = function () {
  this.skipDelimiters();
  var n = getWordLength(this.str, this.index);
  if (n == 0) return null;
  var word = this.str.substr(this.index, n);
  this.index += (n + 1);
  return word;
}

// Get integer
StringParser.prototype.getInt = function () {
  return parseInt(this.getWord());
}

// Get floating number
StringParser.prototype.getFloat = function () {
  return parseFloat(this.getWord());
}

// Get the length of word
function getWordLength(str, start) {
  var n = 0;
  for (var i = start, len = str.length; i < len; i++) {
    var c = str.charAt(i);
    if (c == '\t' || c == ' ' || c == '(' || c == ')' || c == '"')
      break;
  }
  return i - start;
}

//------------------------------------------------------------------------------
// Common function
//------------------------------------------------------------------------------
function calcNormal(p0, p1, p2) {
  // v0: a vector from p1 to p0, v1; a vector from p1 to p2
  var v0 = new Float32Array(3);
  var v1 = new Float32Array(3);
  for (var i = 0; i < 3; i++) {
    v0[i] = p0[i] - p1[i];
    v1[i] = p2[i] - p1[i];
  }

  // The cross product of v0 and v1
  var c = new Float32Array(3);
  c[0] = v0[1] * v1[2] - v0[2] * v1[1];
  c[1] = v0[2] * v1[0] - v0[0] * v1[2];
  c[2] = v0[0] * v1[1] - v0[1] * v1[0];

  // Normalize the result
  var v = new Matrix.Vector3(c);
  v.normalize();
  return v.elements;
}
function isready() {
  return ready;
}
function getInfo() {
  return drawingInfo
          }
exports.init = init
exports.isready = isready
exports.getInfo = getInfo