import { exch, less, type SortValue } from "../utils.ts"

/** One call of partition(): which subarray was partitioned and the result */
export interface PartitionStep<T extends SortValue> {
  lo: number    // first index of the partitioned subarray
  hi: number    // last index of the partitioned subarray
  j: number     // final position of the pivot
  pivot: T      // the partitioning element v (it was at a[lo] before)
  state: T[]    // snapshot of the whole array after this partitioning
}

/**
 * Partition the subarray a[lo..hi] so that a[lo..j-1] <= a[j] <= a[j+1..hi]
 * and return the index j. Translated from partition() in Sedgewick & Wayne's
 * Quick.java (algs4).
 *
 * The pivot v is a[lo]. i scans to the right while a[i] < v, j scans to the
 * left while v < a[j]. Because both checks are strict, an element EQUAL to v
 * stops both scans (and is exchanged). Exported so the tests can use it.
 */
export function partition<T extends SortValue>(a: T[], lo: number, hi: number): number {
  let i = lo
  let j = hi + 1
  const v = a[lo]
  while (true) {
    // find item on lo to swap
    while (less(a[++i], v)) {
      if (i === hi) break
    }

    // find item on hi to swap
    while (less(v, a[--j])) {
      if (j === lo) break // redundant since a[lo] acts as sentinel
    }

    // check if pointers cross
    if (i >= j) break

    exch(a, i, j)
  }

  // put partitioning item v at a[j]
  exch(a, lo, j)

  // now, a[lo .. j-1] <= a[j] <= a[j+1 .. hi]
  return j
}

/**
 * Quicksort a[lo..hi], translated from the recursive sort() in Quick.java.
 * Records a PartitionStep in steps after every partitioning.
 * A subarray with 0 or 1 elements is not partitioned (sort returns right away).
 */
function sort<T extends SortValue>(a: T[], lo: number, hi: number, steps: PartitionStep<T>[]): void {
  if (hi <= lo) return
  const j = partition(a, lo, hi)
  steps.push({ lo, hi, j, pivot: a[j], state: [...a] }) // record a snapshot after each partitioning
  sort(a, lo, j - 1, steps) // the left part first
  sort(a, j + 1, hi, steps) // then the right part
}

/**
 * Quicksort as in Quick.java, but WITHOUT StdRandom.shuffle(a) at the start:
 * the shuffle would make the steps random, so students could not trace them.
 * The input is treated as the array after the shuffle.
 *
 * Returns one PartitionStep per call of partition(). Unlike merge sort, the
 * number of partitionings depends on the input (at most n - 1).
 */
export function quickSortTrace<T extends SortValue>(input: T[]): PartitionStep<T>[] {
  const a = [...input] // create a copy of caller's array so caller's array remains unchanged
  const steps: PartitionStep<T>[] = []
  sort(a, 0, a.length - 1, steps)
  return steps
}

/**
 * Quicksort that returns only the snapshots (one per partitioning), so it has
 * the same shape as the other sorting algorithms and can be passed to helpers
 * like realIntermediateStates.
 */
export function quickSort<T extends SortValue>(input: T[]): T[][] {
  return quickSortTrace(input).map((step) => step.state)
}