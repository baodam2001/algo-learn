import { describe, expect, test } from "vitest"
import { mergeSort, mergeSortTrace } from "./mergeSortAlgorithm.ts"

// Turns Sedgewick's isSorted(a, lo, hi) into a test helper
function isSorted<T extends number | string>(a: T[], lo: number, hi: number): boolean {
  for (let i = lo + 1; i <= hi; i++) {
    if (a[i] < a[i - 1]) return false
  }
  return true
}

describe("mergeSort", () => {
  test("records the array after each merge (worked by hand)", () => {
    // sort(0,5): mid = 2
    //   sort(0,2): mid = 1 -> sort(0,1) merges a[0..1], then merge a[0..2]
    //   sort(3,5): mid = 4 -> sort(3,4) merges a[3..4], then merge a[3..5]
    //   merge a[0..5]
    const passes = mergeSort([5, 3, 8, 1, 9, 2])
    expect(passes).toEqual([
      [3, 5, 8, 1, 9, 2], // merge a[0..1]: 5 | 3 -> 3 5
      [3, 5, 8, 1, 9, 2], // merge a[0..2]: 3 5 | 8 -> already in order, nothing moves
      [3, 5, 8, 1, 9, 2], // merge a[3..4]: 1 | 9 -> already in order, nothing moves
      [3, 5, 8, 1, 2, 9], // merge a[3..5]: 1 9 | 2 -> 1 2 9
      [1, 2, 3, 5, 8, 9], // merge a[0..5]: 3 5 8 | 1 2 9
    ])
  })

  test("records which subarray each merge works on", () => {
    const ranges = mergeSortTrace([5, 3, 8, 1, 9, 2]).map(({ lo, mid, hi }) => [lo, mid, hi])
    expect(ranges).toEqual([
      [0, 0, 1],
      [0, 1, 2],
      [3, 3, 4],
      [3, 4, 5],
      [0, 2, 5],
    ])
  })

  test("with an odd length, the left half gets the extra element", () => {
    // 7 elements: a[0..6] is split at mid = 3, so the left half a[0..3] has 4
    const last = mergeSortTrace([7, 6, 5, 4, 3, 2, 1]).at(-1)!
    expect([last.lo, last.mid, last.hi]).toEqual([0, 3, 6])
  })

  test("gives n - 1 merges for an array of length n", () => {
    for (let n = 1; n <= 10; n++) {
      const input = Array.from({ length: n }, (_, i) => n - i)
      expect(mergeSort(input)).toHaveLength(n - 1)
    }
  })

  test("after each merge of a[lo..hi], that subarray is sorted", () => {
    const steps = mergeSortTrace([4, 7, 1, 7, 3, 0, 2, 9])
    steps.forEach(({ lo, hi, state }) => {
      expect(isSorted(state, lo, hi)).toBe(true)
    })
  })

  test("a merge only changes the subarray it merges", () => {
    const input = [4, 7, 1, 7, 3, 0, 2, 9]
    let before = input
    mergeSortTrace(input).forEach(({ lo, hi, state }) => {
      expect(state.slice(0, lo)).toEqual(before.slice(0, lo))
      expect(state.slice(hi + 1)).toEqual(before.slice(hi + 1))
      before = state
    })
  })

  test("items to the right of the merged subarray have not moved yet", () => {
    const input = [4, 7, 1, 7, 3, 0, 2, 9]
    mergeSortTrace(input).forEach(({ hi, state }) => {
      expect(state.slice(hi + 1)).toEqual(input.slice(hi + 1))
    })
  })

  test("final array is sorted", () => {
    const input = [10, 2, 33, 4, 2, 1]
    const passes = mergeSort(input)
    const expected = [...input].sort((a, b) => a - b)
    expect(passes.at(-1)).toEqual(expected)
  })

  test("compares numbers as numbers, not as text", () => {
    // as strings, "10" < "9" would be true
    expect(mergeSort([10, 9, 100]).at(-1)).toEqual([9, 10, 100])
  })

  test("sorts letters like Sedgewick's tiny.txt", () => {
    const passes = mergeSort("SORTEXAMPLE".split(""))
    expect(passes.at(-1)).toEqual("AEELMOPRSTX".split(""))
  })

  test("does not change the caller's array", () => {
    const input = [3, 1, 2]
    mergeSort(input)
    expect(input).toEqual([3, 1, 2])
  })

  test("edge cases", () => {
    // 0 or 1 items: sort() returns right away, so there are no merges
    expect(mergeSort([])).toEqual([])
    expect(mergeSort([7])).toEqual([])
    // 2 items: exactly one merge
    expect(mergeSort([2, 1])).toEqual([[1, 2]])
    // already sorted: nothing ever moves
    expect(mergeSort([1, 2, 3])).toEqual([
      [1, 2, 3],
      [1, 2, 3],
    ])
    expect(mergeSort([3, 2, 1]).at(-1)).toEqual([1, 2, 3])
  })
})