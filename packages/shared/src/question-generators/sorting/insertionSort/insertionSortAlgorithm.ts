import { exch, less, type SortValue } from "../utils.ts"

/**
 * Insertion sort, translated from Sedgewick & Wayne's Insertion.java (algs4).
 *
 * In iteration i of the outer loop, a[i] is moved to the left (by exchanging
 * it with its left neighbour) until it is no longer smaller than that
 * neighbour. Afterwards a[0..i] is sorted.
 *
 * Returns a snapshot of the array after each pass of the outer loop
 * (one pass = one element inserted). The outer loop starts at i = 1, so an
 * array of length n gives n - 1 snapshots (selection sort gives n).
 * If a[i] is already in the right place, nothing moves and the snapshot is
 * the same as the one before (use uniqueStates to remove repeats).
 */
export function insertionSort<T extends SortValue>(input: T[]): T[][] {
  const a = [...input] // create a copy of caller's array so caller's array remains unchanged
  const passes: T[][] = [] // 2D array to store snapshots
  const n = a.length

  for (let i = 1; i < n; i++) {
    // move a[i] to the left while it is smaller than its left neighbour
    for (let j = i; j > 0 && less(a[j], a[j - 1]); j--) {
      exch(a, j, j - 1)
    }
    passes.push([...a]) // record a snapshot after each pass
  }

  return passes
}