// Created by yujintong on 2018-01-18
;(function(){
  var ABS = Math.abs;
  var isTarget = function (obj,selector){
    while (obj != undefined && obj != null && obj.tagName.toUpperCase() != 'BODY'){
      if (obj.matches(selector)){
        return obj;
      }
      obj = obj.parentNode;
    }
    return null;
  }
  var calcLen = function(v) {
    return  Math.sqrt(v.x * v.x + v.y * v.y);
  }
  var calcAngle = function(a,b){
    var l = calcLen(a) * calcLen(b),cosValue,angle;
    if(l) {
      cosValue = (a.x * b.x + a.y * b.y)/l;
      angle = Math.acos(Math.min(cosValue,1))
      angle = a.x * b.y - b.x * a.y > 0 ? -angle : angle;
      return angle * 180 / Math.PI;
    }
    return 0;
  }
  function Gesture(target,selector) {
    this.target = target instanceof HTMLElement ? target : typeof target === "string" ? document.querySelector(target) : null;
    if(!this.target) return ;
    this.selector = selector;
    this._init();
    this.pretouch = {};
    this.handles = {};
    this.preVector = {x:null,y:null}
    this.distance = 30;
    this._touch = this._touch.bind(this);
    this._move = this._move.bind(this);
    this._end = this._end.bind(this);
    this._cancel = this._cancel.bind(this);
    this.target.addEventListener('touchstart',this._touch,false);
    this.target.addEventListener('touchmove',this._move,false);
    this.target.addEventListener('touchend',this._end,false);
    this.target.addEventListener('touchcancel',this._cancel,false);
  }
  Gesture.prototype = {
    _touch: function(e){
      this.e = e.target;
      var point = e.touches ? e.touches[0] : e;
      var now = Date.now();
      this.touch.startX = point.pageX;
      this.touch.startY = point.pageY;
      this.touch.startTime = now;
      this.longTapTimeout && clearTimeout(this.longTapTimeout);
      this.tapTimeout && clearTimeout(this.tapTimeout);
      this.doubleTap = false;
      this._emit('touch',e);
      if(e.touches.length > 1) {
        var point2 = e.touches[1];
        this.preVector = {x: point2.pageX - this.touch.startX,y: point2.pageY - this.touch.startY}
        this.startDistance = calcLen(this.preVector);
        this._emit('multitouch',e);
      } else {
        var self= this;
        this.longTapTimeout = setTimeout(function(){
          self._emit('longtap',e);
          self.doubleTap = false;
          e.preventDefault();
        },~~this.longtapTime || 800);
        this.doubleTap = this.pretouch.time && now - this.pretouch.time < 300 && ABS(this.touch.startX -this.pretouch.startX) < 30  && ABS(this.touch.startY - this.pretouch.startY) < 30 && ABS(this.touch.startTime - this.pretouch.time) < 300;
        this.pretouch = {//reserve the last touch
          startX : this.touch.startX,
          startY : this.touch.startY,
          time: this.touch.startTime
        };
      }
    },
    _move: function(e){
      var point = e.touches ? e.touches[0] :e;
      this._emit('move',e);
      if(e.touches.length > 1) {//multi touch
        var point2 = e.touches[1];
        var v = {x:point2.pageX - point.pageX,y:point2.pageY - point.pageY};
        this._emit('multimove',e);
        if(this.preVector.x !== null){
          if(this.startDistance) {
            this.params.zoom = calcLen(v) / this.startDistance;
            this._emit('pinch',e);
          }
          this.params.angle = calcAngle(v,this.preVector);
          this._emit('rotate',e);
        }
        this.preVector.x = v.x;
        this.preVector.y = v.y;
      } else {
        var diffX = point.pageX - this.touch.startX,
            diffY = point.pageY - this.touch.startY
        this.params.diffY = diffY;
        this.params.diffX = diffX;
        if(this.movetouch.x) {
          this.params.deltaX = point.pageX - this.movetouch.x;
          this.params.deltaY = point.pageY - this.movetouch.y;
        } else {
          this.params.deltaX = this.params.deltaY = 0;
        }
        if(ABS(diffX) > 30 || ABS(diffY) > 30) {
          this.longTapTimeout &&  clearTimeout(this.longTapTimeout);
          this.tapTimeout && clearTimeout(this.tapTimeout);
          this.doubleTap = false;
        }
        this._emit('slide',e);
        this.movetouch.x = point.pageX;
        this.movetouch.y = point.pageY;
      }
      if(e.touches.length > 1) {
        e.preventDefault();
      }
    },
    _end: function(e) {
      this.longTapTimeout && clearTimeout(this.longTapTimeout);
      var timestamp = Date.now();
      var deltaX = ~~((this.movetouch.x || 0) - this.touch.startX),
          deltaY = ~~((this.movetouch.y || 0) - this.touch.startY);
      var direction = '';
      this._emit('end',e);
      if(this.movetouch.x && (ABS(deltaX) > this.distance || this.movetouch.y !== null && ABS(deltaY) > this.distance)) {//swipe happened
        if(ABS(deltaX) < ABS(deltaY)) {//swipeup and swipedown,but it generally used as a scrolling window
          if(deltaY < 0){
            this._emit('swipeUp',e)
            this.params.direction = 'up';
          } else {
            this._emit('swipeDown',e);
            this.params.direction = 'down';
          }
        } else {
          if(deltaX < 0){
            this._emit('swipeLeft',e);
            this.params.direction = 'left';
          } else {
            this._emit('swipeRight',e);
            this.params.direction = 'right';
          }
        }
        this._emit('swipe',e);
        this._emit("finish",e);
      } else {
        self = this;
        if(!this.doubleTap && timestamp - this.touch.startTime < 300) {
          this.tapTimeout = setTimeout(function(){
            self._emit('tap',e);
            self._emit("finish",e);
          },300);
        } else if(this.doubleTap) {
          this._emit('dbtap',e);
          this.tapTimeout && clearTimeout(this.tapTimeout);
          this._emit("finish",e);
        } else {
          this._emit("finish",e);
        }
      }
      this._init();
      this.preVector = {x:0,y:0}
    },
    _cancel: function(e){
      this._emit('cancel',e);
      this._end();
    },
    _emit: function(type,e){
      !this.handles[type] && (this.handles[type] = []);
      var currentTarget = isTarget(this.e,this.selector);
      if(currentTarget || !this.selector) {
        this.selector && (this.params.selector = currentTarget);
        for(var i = 0,len = this.handles[type].length; i < len; i++) {
          typeof this.handles[type][i] === 'function' && this.handles[type][i](e,this.params);
        }
      }
      return true;
    },
    on: function(type,callback) {
      !this.handles[type] && (this.handles[type] = []);
      this.handles[type].push(callback);
      return this;
    },
    off: function(type) {
      this.handles[type] = [];
    },
    destroy: function() {
      this.longTapTimeout && clearTimeout(this.longTapTimeout);
      this.tapTimeout && clearTimeout(this.tapTimeout);
      this.target.removeEventListener('touchstart',this._touch);
      this.target.removeEventListener('touchmove',this._move);
      this.target.removeEventListener('touchend',this._end);
      this.target.removeEventListener('touchcancel',this._cancel);
      this.params = this.handles = this.movetouch = this.pretouch = this.touch = this.longTapTimeout =  null;
      return false;
    },
    set: function(obj) {
      for(var i in obj) {
        if(i === 'distance') this.distance = ~~obj[i];
        if(i === 'longtapTime') this.longtapTime  = Math.max(500,~~obj[i]);
      }
      return this;
    },
    _init: function() {
      this.touch = {};
      this.movetouch = {}
      this.params = {zoom: 1,deltaX: 0,deltaY: 0,diffX: 0,diffY:0,angle: 0,direction: ''};
    }
  }
  Gesture.prototype.constructor = Gesture;
  if (typeof module !== 'undefined' && typeof exports === 'object') {
    module.exports = Gesture;
  } else if (typeof define === 'function' && define.amd) {
    define(function() { return Gesture; });
  } else {
    window.GT = Gesture;
  }
})();