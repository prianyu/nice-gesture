import Util from "./utils"

const ABS = Math.abs

class Gesture {
  constructor(target, selector) {
    this.target = target instanceof HTMLElement ? target : typeof target === "string" ? document.querySelector(target) : null
    if(!this.target) return 
    this.selector = selector
    this._init()
  }

  _init() {
    this.params = {
      zoom: 1,
      deltaX: 0,
      deltaY: 0,
      diffX: 0,
      diffY:0,
      angle: 0,
      direction: ''
    }
    this._initMetas()
    this._initEvents()
  }

  _initMetas() {
    this.pretouch = {}
    this.preVector = {x:null, y:null}
    this.touch = {}
    this.movetouch = {}
    this.distance = 30
  }

  _initEvents() {
    this.handles = {}
    this._touch = this._touch.bind(this)
    this._move = this._move.bind(this)
    this._end = this._end.bind(this)
    this._cancel = this._cancel.bind(this)
    this.target.addEventListener('touchstart', this._touch, false)
    this.target.addEventListener('touchmove', this._move, false)
    this.target.addEventListener('touchend', this._end, false)
    this.target.addEventListener('touchcancel', this._cancel, false)
  }

  _touch(e) {
    const point = e.touches ? e.touches[0] : e
    let touch = this.touch, now = Date.now()
    this.e = e.target
    touch.startX = point.pageX
    touch.startY = point.pageY
    this.startTime = now
    this.longTapTimeout && clearTimeout(this.longTapTimeout)
    this.tapTimeout && clearTimeout(this.tapTimeout)
    this.doubleTap = false
    this._emit('touch', e)
    if(e.touches.length > 1) {
      const point2 = e.touches[1]
      this.preVector = {x: point2.pageX - this.touch.startX, y: point2.pageY - this.touch.startY}
      this.startDistance = Util.getLength(this.preVector)
      this._emit('multitouch', e)
    } else {
      this.longTapTimeout = setTimeout(() => {
        this._emit('longtap', e)
        this.doubleTap = false
        e.preventDefault()
      }, ~~this.longtapTime || 800)
      this.doubleTap = this.pretouch.time && now - this.pretouch.time < 300 && ABS(this.touch.startX -this.pretouch.startX) < 30
      this.pretouch = {//reserve the last touch
        startX : this.touch.startX,
        startY : this.touch.startY,
        time: this.touch.startTime
      }
    }
  }

  _move(e) {
    const point = e.touches ? e.touches[0] :e
    this._emit('move', e)
    e.preventDefault()
    if(e.touches.length > 1) {//multi touch
      const point2 = e.touches[1];
      let v = {x:point2.pageX - point.pageX, y:point2.pageY - point.pageY}
      this._emit('multimove', e)
      if(this.preVector.x !== null){
        if(this.startDistance) {
          this.params.zoom = Util.getLength(v) / this.startDistance
          this._emit('pinch', e)
        }
        this.params.angle = Util.getAngle(v, this.preVector)
        document.title = this.params.angle
        this._emit('rotate', e)
      }
      this.preVector.x = v.x
      this.preVector.y = v.y
    } else {
      let diffX = point.pageX - this.touch.startX,
          diffY = point.pageY - this.touch.startY
      this.params.diffY = diffY;
      this.params.diffX = diffX;
      if(this.movetouch.x) {
        this.params.deltaX = point.pageX - this.movetouch.x
        this.params.deltaY = point.pageY - this.movetouch.y
      } else {
        this.params.deltaX = this.params.deltaY = 0
      }
      if(ABS(diffX) > 30 || ABS(diffY) > 30) {
        this.longTapTimeout &&  clearTimeout(this.longTapTimeout)
        this.tapTimeout && clearTimeout(this.tapTimeout)
        this.doubleTap = false
      }
      this._emit('slide', e)
      this.movetouch.x = point.pageX
      this.movetouch.y = point.pageY
    }
  }

  _end(e) {
    const timestamp = Date.now()
    const deltaX = ~~((this.movetouch.x || 0) - this.touch.startX),
        deltaY = ~~((this.movetouch.y || 0) - this.touch.startY)
    let params = this.params
    this._emit('end',e);
    this.longTapTimeout && clearTimeout(this.longTapTimeout)
    if(this.movetouch.x && (ABS(deltaX) > this.distance || this.movetouch.y && ABS(deltaY) > this.distance)) {//swipe happened
      this._emit('swipe', e)
      if(ABS(deltaX) < ABS(deltaY)) {//swipeup and swipedown,but it generally used as a scrolling window
        if(deltaY < 0){
          this._emit('swipeUp', e)
          params.direction = 'up'
        } else {
          this._emit('swipeDown', e)
          params.direction = 'down'
        }
      } else {
        if(deltaX < 0){
          this._emit('swipeLeft', e)
          params.direction = 'left'
        } else {
          this._emit('swipeRight', e)
          params.direction = 'right'
        }
      }
      this._emit("finish", e)
    } else {
      if(!this.doubleTap && timestamp - this.touch.startTime < 300) { // tap
        this.tapTimeout = setTimeout(() => {
          this._emit('tap', e)
          this._emit("finish", e)
        }, 300)
      } else if(this.doubleTap) {// doubletap
        this._emit('dbtap', e)
        this.tapTimeout && clearTimeout(this.tapTimeout)
        this._emit("finish", e)
      } else {
        this._emit("finish", e)
      }
    }
    this._initMetas()
    return true
  }

  _cancel(e){
    this._emit('cancel', e)
    this._end()
  }

  _emit(type, e) {
    const handles = this.handles[type] || []
    if(handles.length === 0) return
    if(this.selector) {
      this.params.selector = Util.getTarget(this.e, this.selector) 
    }
    if(this.params.selector || !this.selector) {
      for(let i = 0,len = handles.length; i < len; i++) {
        handles[i](e, this.params)
      }
    }
  }

  on (type, callback) {
    if(!this.handles[type]) this.handles[type] = []
    Util.isFunction(callback) && this.handles[type].push(callback)
    return this
  }

  off (type, callback) {
    const handles = this.handles[type]
    if(callback) {
      for(let i = 0, len = handles.length; i < len; i++) {
        if(handles[i] === callback) handles.splice(i, 1)
      }
    } else {
      this.handles[type] = []
    }  
  }

  destroy () {
    const target = this.target
    this.longTapTimeout && clearTimeout(this.longTapTimeout)
    this.tapTimeout && clearTimeout(this.tapTimeout)
    target.removeEventListener('touchstart', this._touch)
    target.removeEventListener('touchmove', this._move)
    target.removeEventListener('touchend', this._end)
    target.removeEventListener('touchcancel', this._cancel)
    ['params', 'handles', 'movetouch', 'pretouch', 'touch'].map(item => {
      this[item] = null
    })
  }
  set (obj) {
    for(var i in obj) {
      if(i === 'distance') this.distance = ~~obj[i];
      if(i === 'longtapTime') this.longtapTime  = Math.max(500,~~obj[i]);
    }
    return this;
  }

}
export default Gesture