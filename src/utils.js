function getTarget(obj, selector){
  while (obj !== undefined && obj != null && obj.tagName.toUpperCase() !== 'BODY'){
    if (obj.matches(selector)){
      return obj
    }
    obj = obj.parentNode
  }
  return null
}

function getLength(v) {
  return  Math.sqrt(v.x * v.x + v.y * v.y)
}

function getAngle(v1, v2){
  const l = getLength(v1) * getLength(v2)
  let cosValue, angle

  if(l) {
    cosValue = (v1.x * v2.x + v1.y * v2.y) / l
    angle = Math.acos(Math.min(cosValue, 1))
    angle = v1.x * v2.y - v2.x * v1.y > 0 ? -angle : angle
    return angle * 180 / Math.PI
  }
  return 0
}

function isFunction(o) {
  return typeof o === 'function'
}
export default {
  getTarget,
  getLength,
  getAngle,
  isFunction
}