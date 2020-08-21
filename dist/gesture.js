/**
 * gesture v1.1.0 by prianYu
 * https://github.com/prianyu/gesture
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Gesture = factory());
}(this, (function () { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function getTarget(obj, selector) {
    while (obj !== undefined && obj != null && obj.tagName.toUpperCase() !== 'BODY') {
      if (obj.matches(selector)) {
        return obj;
      }

      obj = obj.parentNode;
    }

    return null;
  }

  function getLength(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  function getAngle(v1, v2) {
    var l = getLength(v1) * getLength(v2);
    var cosValue, angle;

    if (l) {
      cosValue = (v1.x * v2.x + v1.y * v2.y) / l;
      angle = Math.acos(Math.min(cosValue, 1));
      angle = a.x * b.y - b.x * a.y > 0 ? -angle : angle;
      return angle * 180 / Math.PI;
    }

    return 0;
  }

  function isFunction(o) {
    return typeof o === 'function';
  }

  var Util = {
    getTarget: getTarget,
    getLength: getLength,
    getAngle: getAngle,
    isFunction: isFunction
  };

  var ABS = Math.abs;

  var Gesture = /*#__PURE__*/function () {
    function Gesture(target, selector) {
      _classCallCheck(this, Gesture);

      this.target = target instanceof HTMLElement ? target : typeof target === "string" ? document.querySelector(target) : null;
      if (!this.target) return;
      this.selector = selector;

      this._init();
    }

    _createClass(Gesture, [{
      key: "_init",
      value: function _init() {
        this.params = {
          zoom: 1,
          deltaX: 0,
          deltaY: 0,
          diffX: 0,
          diffY: 0,
          angle: 0,
          direction: ''
        };

        this._initMetas();

        this._initEvents();
      }
    }, {
      key: "_initMetas",
      value: function _initMetas() {
        this.pretouch = {};
        this.preVector = {
          x: null,
          y: null
        };
        this.touch = {};
        this.movetouch = {};
        this.distance = 30;
      }
    }, {
      key: "_initEvents",
      value: function _initEvents() {
        this.handles = {};
        this._touch = this._touch.bind(this);
        this._move = this._move.bind(this);
        this._end = this._end.bind(this);
        this._cancel = this._cancel.bind(this);
        this.target.addEventListener('touchstart', this._touch, false);
        this.target.addEventListener('touchmove', this._move, false);
        this.target.addEventListener('touchend', this._end, false);
        this.target.addEventListener('touchcancel', this._cancel, false);
      }
    }, {
      key: "_touch",
      value: function _touch(e) {
        var _this = this;

        var point = e.touches ? e.touches[0] : e;
        var touch = this.touch,
            now = Date.now();
        this.e = e.target;
        touch.startX = point.pageX;
        touch.startY = point.pageY;
        this.startTime = now;
        this.longTapTimeout && clearTimeout(this.longTapTimeout);
        this.tapTimeout && clearTimeout(this.tapTimeout);
        this.doubleTap = false;

        this._emit('touch', e);

        if (e.touches.length > 1) {
          var point2 = e.touches[1];
          this.preVector = {
            x: point2.pageX - this.touch.startX,
            y: point2.pageY - this.touch.startY
          };
          this.startDistance = Util.getLength(this.preVector);

          this._emit('multitouch', e);
        } else {
          this.longTapTimeout = setTimeout(function () {
            _this._emit('longtap', e);

            _this.doubleTap = false;
            e.preventDefault();
          }, ~~this.longtapTime || 800);
          this.doubleTap = this.pretouch.time && now - this.pretouch.time < 300 && ABS(this.touch.startX - this.pretouch.startX) < 30;
          this.pretouch = {
            //reserve the last touch
            startX: this.touch.startX,
            startY: this.touch.startY,
            time: this.touch.startTime
          };
        }
      }
    }, {
      key: "_move",
      value: function _move(e) {
        var point = e.touches ? e.touches[0] : e;

        this._emit('move', e);

        if (e.touches.length > 1) {
          //multi touch
          var point2 = e.touches[1];
          var v = {
            x: point2.pageX - point.pageX,
            y: point2.pageY - point.pageY
          };

          this._emit('multimove', e);

          if (this.preVector.x !== null) {
            if (this.startDistance) {
              this.params.zoom = Util.getLength(v) / this.startDistance;

              this._emit('pinch', e);
            }

            this.params.angle = Util.getAngle(v, this.preVector);

            this._emit('rotate', e);
          }

          this.preVector.x = v.x;
          this.preVector.y = v.y;
        } else {
          var diffX = point.pageX - this.touch.startX,
              diffY = point.pageY - this.touch.startY;
          this.params.diffY = diffY;
          this.params.diffX = diffX;

          if (this.movetouch.x) {
            this.params.deltaX = point.pageX - this.movetouch.x;
            this.params.deltaY = point.pageY - this.movetouch.y;
          } else {
            this.params.deltaX = this.params.deltaY = 0;
          }

          if (ABS(diffX) > 30 || ABS(diffY) > 30) {
            this.longTapTimeout && clearTimeout(this.longTapTimeout);
            this.tapTimeout && clearTimeout(this.tapTimeout);
            this.doubleTap = false;
          }

          this._emit('slide', e);

          this.movetouch.x = point.pageX;
          this.movetouch.y = point.pageY;
        }

        if (e.touches.length > 1) {
          e.preventDefault();
        }
      }
    }, {
      key: "_end",
      value: function _end(e) {
        var _this2 = this;

        var timestamp = Date.now();
        var deltaX = ~~((this.movetouch.x || 0) - this.touch.startX),
            deltaY = ~~((this.movetouch.y || 0) - this.touch.startY);
        var params = this.params;

        this._emit('end', e);

        this.longTapTimeout && clearTimeout(this.longTapTimeout);

        if (this.movetouch.x && (ABS(deltaX) > this.distance || this.movetouch.y && ABS(deltaY) > this.distance)) {
          //swipe happened
          this._emit('swipe', e);

          if (ABS(deltaX) < ABS(deltaY)) {
            //swipeup and swipedown,but it generally used as a scrolling window
            if (deltaY < 0) {
              this._emit('swipeUp', e);

              params.direction = 'up';
            } else {
              this._emit('swipeDown', e);

              params.direction = 'down';
            }
          } else {
            if (deltaX < 0) {
              this._emit('swipeLeft', e);

              params.direction = 'left';
            } else {
              this._emit('swipeRight', e);

              params.direction = 'right';
            }
          }

          this._emit("finish", e);
        } else {
          if (!this.doubleTap && timestamp - this.touch.startTime < 300) {
            // tap
            this.tapTimeout = setTimeout(function () {
              _this2._emit('tap', e);

              _this2._emit("finish", e);
            }, 300);
          } else if (this.doubleTap) {
            // doubletap
            this._emit('dbtap', e);

            this.tapTimeout && clearTimeout(this.tapTimeout);

            this._emit("finish", e);
          } else {
            this._emit("finish", e);
          }
        }

        this._initMetas();
      }
    }, {
      key: "_cancel",
      value: function _cancel(e) {
        this._emit('cancel', e);

        this._end();
      }
    }, {
      key: "_emit",
      value: function _emit(type, e) {
        var handles = this.handles[type] || [];
        if (handles.length === 0) return;

        if (this.selector) {
          this.params.selector = Util.getTarget(this.e, this.selector);
        }

        if (this.params.selector || !this.selector) {
          for (var i = 0, len = handles.length; i < len; i++) {
            handles[i](e, this.params);
          }
        }
      }
    }, {
      key: "on",
      value: function on(type, callback) {
        if (!this.handles[type]) this.handles[type] = [];
        Util.isFunction(callback) && this.handles[type].push(callback);
        return this;
      }
    }, {
      key: "off",
      value: function off(type, callback) {
        var handles = this.handles[type];

        if (callback) {
          for (var i = 0, len = handles.length; i < len; i++) {
            if (handles[i] === callback) handles.splice(i, 1);
          }
        } else {
          this.handles[type] = [];
        }
      }
    }, {
      key: "destroy",
      value: function destroy() {
        var _this3 = this;

        var target = this.target;
        this.longTapTimeout && clearTimeout(this.longTapTimeout);
        this.tapTimeout && clearTimeout(this.tapTimeout);
        target.removeEventListener('touchstart', this._touch);
        target.removeEventListener('touchmove', this._move);
        target.removeEventListener('touchend', this._end);
        target.removeEventListener('touchcancel', this._cancel)[('touch')].map(function (item) {
          _this3[item] = null;
        });
      }
    }, {
      key: "set",
      value: function set(obj) {
        for (var i in obj) {
          if (i === 'distance') this.distance = ~~obj[i];
          if (i === 'longtapTime') this.longtapTime = Math.max(500, ~~obj[i]);
        }

        return this;
      }
    }]);

    return Gesture;
  }();

  return Gesture;

})));
