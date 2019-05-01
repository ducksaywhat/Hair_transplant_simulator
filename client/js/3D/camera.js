

import * as Matrix from './matrix'


var Camera = function (Sphere) {
  this.sphere = Sphere;
  this.roam = true;//是否为漫游
  this.viewProjMatrix = new Matrix.Matrix4();
  var p = new Float32Array(3)
  p[0] = 0.0;
  p[1] = 5.0;
  p[2] = 17.0;
  this.Position = new Matrix.Vector3(p)
  var l = new Float32Array(3)
  l[0] = 0.0;
  l[1] = -0.14;
  l[2] = -1.0;
  this.Look = new Matrix.Vector3(l)
  var r = new Float32Array(3)
  r[0] = 1.0;
  r[1] = 0.0;
  r[2] = 0.0;
  this.Right = new Matrix.Vector3(r)
  this.Movespeed = 0.01;
  this.Rotatespeed = 100 / canvas.height;//旋转因子
  //this.Currentangle = [0.0,0.0];//当前旋转角度；
  // this.viewProjMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 300.0);
  // this.viewProjMatrix.lookAt(0.0, 100.0, 100.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
  this.rotateX = 0;
  this.rotateY = 0;
  this.Moving = false;
  this.frozen = true;//是否固定摄像机
  this.follow = true;
  this.Movingfront = true;//前进！or 反向前进！
  this.Perspective = new Matrix.Matrix4().setPerspective(30.0, canvas.width / canvas.height, 1.0, 1700.0);
  this.HUDOrtho = new Matrix.Matrix4().setOrtho(-1.0, 1.0, -1.0, 1.0, 0.0,2.0);
  this.reSet();
  return this;
}
Camera.prototype.reSet = function () {
  var P = this.Position.elements;
  var L = this.Position.add(this.Look).elements;
  //console.log(L)
  var VM = this.viewProjMatrix;
  VM.set(this.Perspective);
  VM.lookAt(P[0], P[1], P[2], L[0], L[1], L[2], 0.0, 1.0, 0.0);//非滑翔模式，up固定为y轴方向
}
Camera.prototype.reSet_follow = function () {
  var P = this.Position.elements;
  var l = new Float32Array(3)
  l[0] = this.sphere.Position.x - P[0];
  l[1] = this.sphere.Position.y - P[1]+0.7;
  l[2] = this.sphere.Position.z - P[2];
  this.Look = new Matrix.Vector3(l).normalize();
  var VM = this.viewProjMatrix;
  VM.set(this.Perspective);
  VM.lookAt(P[0], P[1], P[2], this.sphere.Position.x, this.sphere.Position.y, this.sphere.Position.z, 0.0, 1.0, 0.0);//非滑翔模式，up固定为y轴方向
}
Camera.prototype.rotate = function ()
{
  if (this.rotateX == 0 && this.rotateY==0)return
  var ry =this.rotateX/15 //x/20//绕up方向旋转 此处固定为y轴正方向
  var rx =this.rotateY/20 //y/20//绕与look向量和up向量
  var L = this.Look
  var R = this.Right
  var RM = new Matrix.Matrix4();
  RM.setRotate(ry,0.0,1.0,0.0)
  RM.rotate(rx, R.elements[0], R.elements[1], R.elements[2])
  this.Look = RM.multiplyVector3(L);
  this.Right = RM.multiplyVector3(R);
  this.reSet();
  this.rotateX=0;
  this.rotateY=0;

}
Camera.prototype.move = function (n) {
  if (this.frozen) return
  var P = this.Position.elements;
  var L = this.Look.elements;
  var speed = this.Movespeed;
  P[0] += n * speed * L[0];
  P[1] += n * speed * L[1];
  P[2] += n * speed * L[2];
  //this.Position.elements = P;
  //console.log("?") 
  this.reSet();
}
Camera.prototype.getViewM = function () 
{
  if(this.follow)
  {
    //跟随相机处理
    this.reSet_follow();
    return this.viewProjMatrix
  }
  else
  {
  return this.viewProjMatrix//.rotate(90,0,1,0);
  }
}
Camera.prototype.update_roam = function()
{

}
Camera.prototype.changemode = function()
{
  if(this.follow)
  {
    this.follow = false;
    var l = new Float32Array(3)
    var P = this.Position.elements;
    l[0] = this.sphere.Position.x - P[0];
    l[1] = this.sphere.Position.y - P[1];
    l[2] = this.sphere.Position.z - P[2];
    this.Look = new Matrix.Vector3(l).normalize();
  }
  else
  {
    this.follow=true;
  }
}
Camera.prototype.getHUDviewM = function() {
  //if(this.roam)this.update_roam();
  return this.HUDOrtho;
}
exports.Camera  = Camera;