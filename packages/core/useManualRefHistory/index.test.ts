import { describe, expect, it } from 'vitest'
import { ref as deepRef, isReactive, shallowRef } from 'vue'
import { useManualRefHistory } from './index'

describe('useManualRefHistory', () => {
  it('should record', () => {
    const v = shallowRef(0)
    const { history, commit } = useManualRefHistory(v)

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    v.value = 2
    commit()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(2)
    expect(history.value[1].snapshot).toBe(0)
  })

  it('should be able to undo and redo', () => {
    const v = shallowRef(0)
    const { commit, undo, redo, clear, canUndo, canRedo, history, last } = useManualRefHistory(v)

    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)

    v.value = 2
    commit()
    v.value = 3
    commit()
    v.value = 4
    commit()

    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(false)

    expect(v.value).toBe(4)
    expect(history.value.length).toBe(4)
    expect(last.value.snapshot).toBe(4)
    undo()

    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(true)

    expect(v.value).toBe(3)
    expect(last.value.snapshot).toBe(3)
    undo()
    expect(v.value).toBe(2)
    expect(last.value.snapshot).toBe(2)
    redo()
    expect(v.value).toBe(3)
    expect(last.value.snapshot).toBe(3)
    redo()
    expect(v.value).toBe(4)
    expect(last.value.snapshot).toBe(4)

    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(false)

    redo()
    expect(v.value).toBe(4)
    expect(last.value.snapshot).toBe(4)

    clear()
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
  })

  it('object with deep', () => {
    const v = deepRef({ foo: 'bar' })
    const { commit, undo, history } = useManualRefHistory(v, { clone: true })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot.foo).toBe('bar')

    v.value.foo = 'foo'
    commit()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot.foo).toBe('foo')

    // different references
    expect(history.value[1].snapshot.foo).toBe('bar')
    expect(history.value[0].snapshot).not.toBe(history.value[1].snapshot)

    undo()

    // history references should not be equal to the source
    expect(history.value[0].snapshot).not.toBe(v.value)
  })

  it('object with clone function', () => {
    const v = deepRef({ foo: 'bar' })
    const { commit, undo, history } = useManualRefHistory(v, { clone: x => JSON.parse(JSON.stringify(x)) })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot.foo).toBe('bar')

    v.value.foo = 'foo'
    commit()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot.foo).toBe('foo')

    // different references
    expect(history.value[1].snapshot.foo).toBe('bar')
    expect(history.value[0].snapshot).not.toBe(history.value[1].snapshot)

    undo()

    // history references should not be equal to the source
    expect(history.value[0].snapshot).not.toBe(v.value)
  })

  it('dump + parse', () => {
    const v = deepRef({ a: 'bar' })
    const { history, commit, undo } = useManualRefHistory(v, {
      dump: v => JSON.stringify(v),
      parse: (v: string) => JSON.parse(v),
    })

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe('{"a":"bar"}')

    v.value.a = 'foo'
    commit()

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe('{"a":"foo"}')
    expect(history.value[1].snapshot).toBe('{"a":"bar"}')

    undo()

    expect(v.value.a).toBe('bar')
  })

  it('reset', () => {
    const v = shallowRef(0)
    const { history, commit, undoStack, redoStack, reset, undo } = useManualRefHistory(v)

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    v.value = 1
    commit()

    v.value = 2

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(1)
    expect(history.value[1].snapshot).toBe(0)

    reset()

    // v value needs to be the last history point, but history is unchanged
    expect(v.value).toBe(1)

    expect(history.value.length).toBe(2)
    expect(history.value[0].snapshot).toBe(1)
    expect(history.value[1].snapshot).toBe(0)

    reset()

    // Calling reset twice is a no-op
    expect(v.value).toBe(1)

    expect(history.value.length).toBe(2)
    expect(history.value[1].snapshot).toBe(0)
    expect(history.value[0].snapshot).toBe(1)

    // Same test, but with a non empty redoStack

    v.value = 3
    commit()

    undo()

    v.value = 2

    reset()

    expect(v.value).toBe(1)

    expect(undoStack.value.length).toBe(1)
    expect(undoStack.value[0].snapshot).toBe(0)

    expect(redoStack.value.length).toBe(1)
    expect(redoStack.value[0].snapshot).toBe(3)
  })

  it('snapshots should not be reactive', async () => {
    const v = shallowRef(0)
    const { history, commit } = useManualRefHistory(v)

    expect(history.value.length).toBe(1)
    expect(history.value[0].snapshot).toBe(0)

    v.value = 2
    commit()

    expect(isReactive(history.value[0])).toBe(false)
    expect(isReactive(history.value[1])).toBe(false)
  })
})
