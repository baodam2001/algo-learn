import type { Language } from "../../api/Language.ts"
import type Random from "../../utils/random.ts"

/** The sorting algorithms covered by the sorting section */
export type SortingAlgorithm = "selection" | "insertion" | "merge" | "quick"

/** What the input array is made of: letters (M I N K) or numbers (5 2 9 1) */
export type InputKind = "letters" | "numbers"

/* A value that can be in the array we sort - either string or number */
export type SortValue = string | number

/** The letters used to build random input arrays */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

/**
 * Is v < w? (algs4 helper, shared by all sorting algorithms)
 */
export function less<T extends SortValue>(v: T, w: T): boolean {
  return v < w
}

/**
 * Exchange a[i] and a[j] (algs4 helper, shared by all sorting algorithms)
 * use a more concise JavaScript feature to swap 2 elements in an array
 */
export function exch<T>(a: T[], i: number, j: number): void {
  ;[a[i], a[j]] = [a[j], a[i]]
}

/**
 * Checks whether the array is sorted in ascending order.
 * Equal neighbours (e.g. E E) still count as sorted.
 */
export function isSorted<T extends SortValue>(a: readonly T[]): boolean {
  for (let i = 1; i < a.length; i++) {
    if (less(a[i], a[i - 1])) return false
  }
  return true
}

/**
 * Checks whether two arrays have the same elements in the same order.
 * (=== on arrays only checks if they are the same object, not the content)
 */
export function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Turns an array into a string, e.g. ["M", "I", "N", "K"] -> "M I N K".
 * Used to display an array in the question text and to store arrays in a Set
 * (a Set cannot compare arrays by content, but it can compare strings).
 */
export function arrayToKey(a: readonly SortValue[]): string {
  return a.join(" ")
}

/**
 * Turns an array into LaTeX in typewriter font, like the Queue questions:
 * ["M", "I", "N", "K"] -> \texttt{M I N K}
 * Without math delimiters, so the caller decides: $...$ (inside a sentence)
 * or \[...\] (on its own centered line).
 */
export function arrayToTex(a: readonly SortValue[]): string {
  return `\\texttt{${arrayToKey(a)}}`
}

/**
 * Generates an array of random capital letters.
 *
 * @param random The seeded random generator (never use Math.random, otherwise
 *   the permalink of a question would not reproduce the same question)
 * @param length The number of letters
 * @param allowDuplicates Whether a letter may appear more than once (like the
 *   two E's in E A S Y Q U E S T I O N)
 */
export function generateLetters(random: Random, length: number, allowDuplicates = true): string[] {
  if (allowDuplicates) {
    const letters: string[] = []
    for (let i = 0; i < length; i++) {
      letters.push(random.choice(LETTERS))
    }
    return letters
  }
  // subset picks distinct letters (in random order), so length must be <= 26
  return random.subset(LETTERS, length)
}

/**
 * Generates an array of random whole numbers between min and max.
 * The numbers are stored as numbers, NOT strings: as strings, "10" < "9"
 * would be true and the sorting would go wrong.
 *
 * @param allowDuplicates Whether a number may appear more than once. Without
 *   duplicates, max - min + 1 must be at least length.
 */
export function generateNumbers(
  random: Random,
  length: number,
  min = 1,
  max = 99,
  allowDuplicates = true,
): number[] {
  const numbers: number[] = []
  while (numbers.length < length) {
    const n = random.int(min, max)
    if (allowDuplicates || !numbers.includes(n)) {
      numbers.push(n)
    }
  }
  return numbers
}

/**
 * Generates random inputs until it finds one that is NOT already sorted and
 * that passes the extra check isUsable.
 *
 * @param kind Whether the array contains letters or numbers
 * @param isUsable An optional extra check from the generator, e.g. "the
 *   algorithm makes at least k exchanges on this input"
 * @param maxAttempts Safety limit so a bad check can never cause an endless loop
 */
export function generateUnsortedInput({
  random,
  length,
  kind = "letters",
  allowDuplicates = true,
  isUsable = () => true,
  maxAttempts = 1000,
}: {
  random: Random
  length: number
  kind?: InputKind
  allowDuplicates?: boolean
  isUsable?: (input: SortValue[]) => boolean
  maxAttempts?: number
}): SortValue[] {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const input: SortValue[] =
      kind === "letters"
        ? generateLetters(random, length, allowDuplicates)
        : generateNumbers(random, length, 1, 99, allowDuplicates)
    if (!isSorted(input) && isUsable(input)) {
      return input
    }
  }
  throw new Error(`No usable unsorted input of length ${length} found after ${maxAttempts} attempts`)
}

/**
 * Removes repeated states from a list of snapshots, keeping the first
 * occurrence and the original order. Needed because a self-exchange in
 * selection sort produces the same state twice.
 */
export function uniqueStates<T extends SortValue>(states: readonly T[][]): T[][] {
  const seen = new Set<string>()
  const result: T[][] = []
  for (const state of states) {
    const key = arrayToKey(state)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(state)
    }
  }
  return result
}

const ORDINALS: Record<Language, string[]> = {
  en: ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"],
  // dative form, as in "nach dem ersten Austausch"
  de: [
    "ersten",
    "zweiten",
    "dritten",
    "vierten",
    "fünften",
    "sechsten",
    "siebten",
    "achten",
    "neunten",
    "zehnten",
  ],
}

/**
 * Returns the ordinal word for k, e.g. 1 -> "first" (en) or "ersten" (de).
 * Above ten it falls back to "11th" / "11.".
 */
export function ordinal(k: number, lang: Language): string {
  if (k >= 1 && k <= ORDINALS[lang].length) {
    return ORDINALS[lang][k - 1]
  }
  if (lang === "de") return `${k}.`
  const lastTwo = k % 100
  const last = k % 10
  if (lastTwo >= 11 && lastTwo <= 13) return `${k}th`
  if (last === 1) return `${k}st`
  if (last === 2) return `${k}nd`
  if (last === 3) return `${k}rd`
  return `${k}th`
}