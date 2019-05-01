var HUD = function (camera, sphere, arrowsonsphere,cwidth,cheight) //适配屏幕
{
  //HUD显示区域适配屏幕问题
  //字体大小
  this.fontsize = Math.floor((cwidth*cheight)/10000);
  if (this.fontsize > 50) this.fontsize = 50;
  //得分
  this.scorepos = { x: Math.floor(cwidth * 0.02), y: Math.floor(cheight * 0.07) }
  //时间
  this.timepos = { x: Math.floor(cwidth * 0.02), y: Math.floor(cheight * 0.14) }
  //静音
  this.voicepos = { x: Math.floor(cwidth * 0.02), y: Math.floor(cheight * 0.21) }
  //跟随
  this.followpos = { x: Math.floor(cwidth * 0.85), y: Math.floor(cheight * 0.55) }
  //射击
  this.shootpos = { x: Math.floor(cwidth * 0.85), y: Math.floor(cheight * 0.85) }
  this.camera = camera;
  this.sphere = sphere;
  this.arrowsonsphere = arrowsonsphere;
  this.HUDcanvas = wx.createCanvas();
  this.HUDcanvas.width =  cwidth;
  this.HUDcanvas.height = cheight;
  this.HUDcxt = this.HUDcanvas.getContext('2d');
  this.needupdate = true//false;
  this.HUDtextrue = null;
  this.update=this.update_game;
  return this;
}
var time = 0;
var clock = 0;
var temp = 0;
HUD.prototype.startup = function()
{
  time =new Date().getTime();
}
HUD.prototype.update_menu  =function()
{//菜单HUD

}
HUD.prototype.update_game = function()
{
  temp = time;
  time = new Date().getTime();
  clock += time - temp;
  //clock = (time - temp)%
  if(!this.needupdate)return;
  //console.log("我更新辽")
  var p = this.camera.Position.elements;
  var l = this.camera.Look.elements;
  var r = this.sphere.Angle;  
  this.HUDcxt.clearRect(0, 0, this.HUDcanvas.width, this.HUDcanvas.height);
  this.HUDcxt.fillStyle = '#ff3366';
  // this.HUDcxt.fillRect(5, 5, this.HUDcanvas.width-10, this.HUDcanvas.height-10)
  // return
  this.HUDcxt.font = this.fontsize+"px '黑体'"
  //得分
  this.HUDcxt.fillText("Score "+this.arrowsonsphere.arrows.length, this.scorepos.x, this.scorepos.y);
  //时间
  this.HUDcxt.fillText("Time " + Math.floor(clock / 1000), this.timepos.x, this.timepos.y);
  //静音
  this.HUDcxt.fillText("Voice", this.voicepos.x, this.voicepos.y);
  //跟随
  this.HUDcxt.fillText("Follow", this.followpos.x, this.followpos.y);
  //射击
  this.HUDcxt.fillText("Shoot", this.shootpos.x, this.shootpos.y);
  //更新内容
}
HUD.prototype.requestupdate = function(gl)
{
  this.update();
  gl.bindTexture(gl.TEXTURE_2D, this.HUDtexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.getImageData(0, 0, this.HUDcanvas.width, this.HUDcanvas.height));

}
HUD.prototype.getImageData = function(x,y,w,h)
{
  return this.HUDcxt.getImageData(x,y,w,h);
}
HUD.prototype.initTexture = function(gl,num,x,y,w,h)
{
  this.HUDtexture = gl.createTexture();
  gl.activeTexture(gl['TEXTURE'+num]);
  gl.bindTexture(gl.TEXTURE_2D, this.HUDtexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.getImageData(x, y, w, h));
}
exports.HUD = HUD;