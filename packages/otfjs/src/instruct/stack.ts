import { from2dot14, from26dot6, to2dot14, to26dot6 } from '../bit.js'

export class Stack {
  private values: Int32Array
  private top = 0

  constructor(size: number) {
    this.values = new Int32Array(size)
  }

  clear() {
    this.top = 0
  }

  depth() {
    return this.top
  }

  at(index: number) {
    return this.values[index]
  }

  delete(index: number) {
    const value = this.values[index]
    this.values.copyWithin(index, index + 1, this.top--)
    return value
  }

  push(value: number) {
    this.values[this.top++] = value
  }

  pop() {
    return this.values[--this.top]
  }

  popU32() {
    return this.pop() >>> 0
  }

  push26dot6(value: number) {
    this.push(to26dot6(value))
  }

  pop26dot6() {
    return from26dot6(this.pop())
  }

  push2dot14(value: number) {
    this.push(to2dot14(value))
  }

  pop2dot14() {
    return from2dot14(this.pop())
  }
}
