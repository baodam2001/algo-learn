import { less, type SortValue } from "../utils.ts"

/** One call of merge(): which subarray was merged and the array afterwards */
export interface MergeStep<T extends SortValue> {
  lo: number // first index of the merged subarray
  mid: number // last index of the left half
  hi: number // last index of the merged subarray
  state: T[] // snapshot of the whole array after this merge
}

/**
 * Stably merge a[lo..mid] with a[mid+1..hi] using aux[lo..hi].
 * Translated from merge() in Sedgewick & Wayne's Merge.java (algs4).
 * Both halves must already be sorted. Exported so the generator can reuse it.
 */
export function merge<T extends SortValue>(a: T[], aux: T[], lo: number, mid: number, hi: number): void {
  // copy to aux[]
  for (let k = lo; k <= hi; k++) {
    aux[k] = a[k]
  }

  // merge back to a[]
  let i = lo
  let j = mid + 1
  for (let k = lo; k <= hi; k++) {
    if (i > mid)
      a[k] = aux[j++] // left half used up: take from the right
    else if (j > hi)
      a[k] = aux[i++] // right half used up: take from the left
    else if (less(aux[j], aux[i]))
      a[k] = aux[j++] // right one is smaller
    else a[k] = aux[i++] // left one is smaller or equal (keeps it stable)
  }
}

/**
 * Mergesort a[lo..hi] using aux[lo..hi], translated from the recursive sort()
 * in Merge.java. Records a MergeStep in steps after every merge.
 *
 * a[lo..hi] is split at mid = lo + floor((hi - lo) / 2), so with an odd number
 * of elements the LEFT half gets the extra one. The left half is sorted first,
 * then the right half, then both halves are merged.
 */
function sort<T extends SortValue>(
  a: T[],
  aux: T[],
  lo: number,
  hi: number,
  steps: MergeStep<T>[],
): void {
  if (hi <= lo) return // 0 or 1 element: already sorted
  const mid = lo + Math.floor((hi - lo) / 2) // Java's int division rounds down
  sort(a, aux, lo, mid, steps) // sort the left half first
  sort(a, aux, mid + 1, hi, steps) // then the right half
  merge(a, aux, lo, mid, hi) // then merge both halves
  steps.push({ lo, mid, hi, state: [...a] }) // record a snapshot after each merge
}

/**
 * Top-down merge sort (Merge.java). Returns one MergeStep per call of merge().
 * An array of length n gives n - 1 merges. If the two halves are already in
 * order, nothing moves and the snapshot is the same as the one before (use
 * uniqueStates to remove repeats).
 */
export function mergeSortTrace<T extends SortValue>(input: T[]): MergeStep<T>[] {
  const a = [...input] // create a copy of caller's array so caller's array remains unchanged
  const aux: T[] = new Array<T>(a.length) // auxiliary array, like in Merge.java
  const steps: MergeStep<T>[] = []
  sort(a, aux, 0, a.length - 1, steps)
  return steps
}

/**
 * Top-down merge sort that returns only the snapshots (one per merge), so it
 * has the same shape as selectionSort and insertionSort and can be passed to
 * helpers like realIntermediateStates.
 */
export function mergeSort<T extends SortValue>(input: T[]): T[][] {
  return mergeSortTrace(input).map((step) => step.state)
}