import { describe, expect, test } from "vitest"
import { selectionSort } from "./selectionSortAlgorithm.ts"

// Turns Sedgewick's isSorted(a, lo, hi) into a test helper
function isSorted<T extends number | string>(a: T[], lo: number, hi: number): boolean {
  for (let i = lo + 1; i <= hi; i++) {
    if (a[i] < a[i - 1]) return false
  }
  return true
}

describe("selectionSort", () => {
  test("records the array after each pass (worked by hand)", () => {
    const passes = selectionSort([5, 3, 8, 1, 9, 2])
    expect(passes).toEqual([
      [1, 3, 8, 5, 9, 2],
      [1, 2, 8, 5, 9, 3],
      [1, 2, 3, 5, 9, 8],
      [1, 2, 3, 5, 9, 8], // 5 is already the minimum, nothing moves
      [1, 2, 3, 5, 8, 9],
      [1, 2, 3, 5, 8, 9],
    ])
  })

  test("after pass i, the first i+1 items are sorted and smallest", () => {
    const passes = selectionSort([4, 7, 1, 7, 3, 0, 2])
    passes.forEach((a, i) => {
      expect(isSorted(a, 0, i)).toBe(true)
      for (let k = i + 1; k < a.length; k++) {
        expect(a[i]).toBeLessThanOrEqual(a[k])
      }
    })
  })

  test("final array is sorted", () => {
    const input = [10, 2, 33, 4, 2, 1]
    const passes = selectionSort(input)
    const expected = [...input].sort((a, b) => a - b)
    expect(passes[passes.length - 1]).toEqual(expected)
  })

  test("sorts letters like Sedgewick's tiny.txt", () => {
    const passes = selectionSort("SORTEXAMPLE".split(""))
    expect(passes.at(-1)).toEqual("AEELMOPRSTX".split(""))
  })

  test("does not change the caller's array", () => {
    const input = [3, 1, 2]
    selectionSort(input)
    expect(input).toEqual([3, 1, 2])
  })

  test("edge cases", () => {
    expect(selectionSort([])).toEqual([])
    expect(selectionSort([7]).at(-1)).toEqual([7])
    expect(selectionSort([1, 2, 3]).at(-1)).toEqual([1, 2, 3])
    expect(selectionSort([3, 2, 1]).at(-1)).toEqual([1, 2, 3])
  })
})