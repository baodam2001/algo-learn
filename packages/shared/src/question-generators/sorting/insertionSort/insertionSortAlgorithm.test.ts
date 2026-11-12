import { describe, expect, test } from "vitest"
import { insertionSort } from "./insertionSortAlgorithm.ts"

// Turns Sedgewick's isSorted(a, lo, hi) into a test helper
function isSorted<T extends number | string>(a: T[], lo: number, hi: number): boolean {
  for (let i = lo + 1; i <= hi; i++) {
    if (a[i] < a[i - 1]) return false
  }
  return true
}

describe("insertionSort", () => {
  test("records the array after each pass (worked by hand)", () => {
    const passes = insertionSort([5, 3, 8, 1, 9, 2])
    expect(passes).toEqual([
      [3, 5, 8, 1, 9, 2], // 3 moves in front of 5
      [3, 5, 8, 1, 9, 2], // 8 is already in place, nothing moves
      [1, 3, 5, 8, 9, 2], // 1 moves all the way to the front
      [1, 3, 5, 8, 9, 2], // 9 is already in place, nothing moves
      [1, 2, 3, 5, 8, 9], // 2 moves in front of 3
    ])
  })

  test("gives n - 1 snapshots for an array of length n", () => {
    expect(insertionSort([4, 7, 1, 7, 3, 0, 2])).toHaveLength(6)
  })

  test("after pass i, the first i+2 items are sorted", () => {
    // pass i (counting from 0) inserts a[i + 1], so a[0..i+1] is sorted
    const passes = insertionSort([4, 7, 1, 7, 3, 0, 2])
    passes.forEach((a, i) => {
      expect(isSorted(a, 0, i + 1)).toBe(true)
    })
  })

  test("items to the right of the inserted one have not moved yet", () => {
    const input = [4, 7, 1, 7, 3, 0, 2]
    const passes = insertionSort(input)
    passes.forEach((a, i) => {
      expect(a.slice(i + 2)).toEqual(input.slice(i + 2))
    })
  })

  test("final array is sorted", () => {
    const input = [10, 2, 33, 4, 2, 1]
    const passes = insertionSort(input)
    const expected = [...input].sort((a, b) => a - b)
    expect(passes[passes.length - 1]).toEqual(expected)
  })

  test("sorts letters like Sedgewick's tiny.txt", () => {
    const passes = insertionSort("SORTEXAMPLE".split(""))
    expect(passes.at(-1)).toEqual("AEELMOPRSTX".split(""))
  })

  test("does not change the caller's array", () => {
    const input = [3, 1, 2]
    insertionSort(input)
    expect(input).toEqual([3, 1, 2])
  })

  test("edge cases", () => {
    // the outer loop starts at i = 1, so 0 or 1 items give no snapshots
    expect(insertionSort([])).toEqual([])
    expect(insertionSort([7])).toEqual([])
    // already sorted: nothing ever moves
    expect(insertionSort([1, 2, 3])).toEqual([
      [1, 2, 3],
      [1, 2, 3],
    ])
    expect(insertionSort([3, 2, 1]).at(-1)).toEqual([1, 2, 3])
  })
})