import { describe, expect, test } from "vitest"
import { partition, quickSort, quickSortTrace } from "./quickSortAlgorithm.ts"

describe("partition", () => {
  test("the exam question: [5, 1, 4, 1, 3, 9, 2, 6, 5, 3] with pivot 5", () => {
    // v = 5
    // i stops at 9 (index 5), j stops at 3 (index 9) -> exchange: 5 1 4 1 3 3 2 6 5 9
    // i stops at 6 (index 7), j stops at 5 (index 8, EQUAL to v) -> exchange: 5 1 4 1 3 3 2 5 6 9
    // i stops at 6 (index 8), j stops at 5 (index 7) -> pointers crossed
    // exchange a[0] and a[7] (two 5s, so nothing visibly changes)
    const a = [5, 1, 4, 1, 3, 9, 2, 6, 5, 3]
    const j = partition(a, 0, a.length - 1)
    expect(a).toEqual([5, 1, 4, 1, 3, 3, 2, 5, 6, 9])
    expect(j).toBe(7)
  })

  test("elements equal to the pivot stop both scans", () => {
    // v = B: i stops at C, j stops at A -> B A A B C
    // then i AND j both stop at the other B (index 3) -> crossed, pivot goes to index 3
    // (if the scans skipped equal elements, the result would be A A B B C)
    const a = ["B", "C", "A", "B", "A"]
    const j = partition(a, 0, a.length - 1)
    expect(a).toEqual(["B", "A", "A", "B", "C"])
    expect(j).toBe(3)
  })

  test("with all keys equal, the pivot ends up in the middle", () => {
    // this is why the textbook stops the scans at equal keys
    const a = [2, 2, 2, 2, 2]
    expect(partition(a, 0, 4)).toBe(2)
  })

  test("only changes a[lo..hi]", () => {
    const a = [9, 8, 5, 3, 7, 1, 0]
    partition(a, 2, 5)
    expect(a.slice(0, 2)).toEqual([9, 8])
    expect(a.slice(6)).toEqual([0])
  })
})

describe("quickSort", () => {
  test("records the array after each partitioning (worked by hand)", () => {
    const steps = quickSortTrace([5, 3, 8, 1, 9, 2])
    expect(steps).toEqual([
      // a[0..5], v = 5: i stops at 8, j stops at 2 -> exchange: 5 3 2 1 9 8
      // i stops at 9 (index 4), j stops at 1 (index 3) -> crossed, exchange a[0] and a[3]
      { lo: 0, hi: 5, j: 3, pivot: 5, state: [1, 3, 2, 5, 9, 8] },
      // a[0..2], v = 1: 1 is the smallest, nothing moves
      { lo: 0, hi: 2, j: 0, pivot: 1, state: [1, 3, 2, 5, 9, 8] },
      // a[1..2], v = 3: 3 and 2 are exchanged
      { lo: 1, hi: 2, j: 2, pivot: 3, state: [1, 2, 3, 5, 9, 8] },
      // a[4..5], v = 9: 9 and 8 are exchanged
      { lo: 4, hi: 5, j: 5, pivot: 9, state: [1, 2, 3, 5, 8, 9] },
    ])
  })

  test("does not shuffle: the first pivot is the first element", () => {
    const input = [5, 1, 4, 1, 3, 9, 2, 6, 5, 3]
    expect(quickSortTrace(input)[0].pivot).toBe(5)
    // and the same input always gives the same steps
    expect(quickSort(input)).toEqual(quickSort(input))
  })

  test("after each partitioning, the pivot is in place and the parts are split correctly", () => {
    const steps = quickSortTrace([4, 7, 1, 7, 3, 0, 2, 9, 4, 4])
    steps.forEach(({ lo, hi, j, pivot, state }) => {
      expect(state[j]).toBe(pivot)
      state.slice(lo, j).forEach((x) => expect(x).toBeLessThanOrEqual(pivot))
      state.slice(j + 1, hi + 1).forEach((x) => expect(x).toBeGreaterThanOrEqual(pivot))
    })
  })

  test("a partitioning only changes the subarray it partitions", () => {
    const input = [4, 7, 1, 7, 3, 0, 2, 9, 4, 4]
    let before = input
    quickSortTrace(input).forEach(({ lo, hi, state }) => {
      expect(state.slice(0, lo)).toEqual(before.slice(0, lo))
      expect(state.slice(hi + 1)).toEqual(before.slice(hi + 1))
      before = state
    })
  })

  test("gives at most n - 1 partitionings", () => {
    for (let n = 1; n <= 10; n++) {
      const input = Array.from({ length: n }, (_, i) => (i * 7) % 5)
      expect(quickSort(input).length).toBeLessThanOrEqual(n - 1)
    }
  })

  test("final array is sorted", () => {
    const input = [5, 1, 4, 1, 3, 9, 2, 6, 5, 3]
    const expected = [...input].sort((a, b) => a - b)
    expect(quickSort(input).at(-1)).toEqual(expected)
  })

  test("compares numbers as numbers, not as text", () => {
    // as strings, "10" < "9" would be true
    expect(quickSort([10, 9, 100]).at(-1)).toEqual([9, 10, 100])
  })

  test("sorts letters like Sedgewick's tiny.txt", () => {
    const passes = quickSort("SORTEXAMPLE".split(""))
    expect(passes.at(-1)).toEqual("AEELMOPRSTX".split(""))
  })

  test("does not change the caller's array", () => {
    const input = [3, 1, 2]
    quickSort(input)
    expect(input).toEqual([3, 1, 2])
  })

  test("edge cases", () => {
    // 0 or 1 items: sort() returns right away, so there are no partitionings
    expect(quickSort([])).toEqual([])
    expect(quickSort([7])).toEqual([])
    // 2 items: exactly one partitioning
    expect(quickSort([2, 1])).toEqual([[1, 2]])
    expect(quickSort([3, 2, 1]).at(-1)).toEqual([1, 2, 3])
  })
})