import type { Language } from "@shared/api/Language.ts"
import {
  minimalMultipleChoiceFeedback,
  type FreeTextFeedbackFunction,
  type FreeTextFormatFunction,
  type FreeTextQuestion,
  type MultipleChoiceQuestion,
  type QuestionGenerator,
} from "@shared/api/QuestionGenerator.ts"
import { serializeGeneratorCall } from "@shared/api/QuestionRouter.ts"
import {
  merge,
  mergeSort,
  mergeSortTrace,
  type MergeStep,
} from "@shared/question-generators/sorting/mergeSort/mergeSortAlgorithm.ts"
import {
  arraysEqual,
  arrayToKey,
  arrayToTex,
  generateUnsortedInput,
  isSorted,
  ordinal,
  parseArrayInput,
  realIntermediateStates,
  type InputKind,
  type SortValue,
} from "@shared/question-generators/sorting/utils.ts"
import Random from "@shared/utils/random.ts"
import { t, tFunctional, type Translations } from "@shared/utils/translations.ts"

/** The two question types (variants) of this generator */
// one step = one call of merge(), "merge" is used in the text to make consistent questions for students
type Variant = "stateafter" | "notarising"

const translations: Translations = {
  en: {
    name: "Merge Sort",
    description: "Trace the steps of top-down merge sort",
    stateAfterText: `We sort the following array in ascending order using **top-down merge sort** (the recursive version):
\\[{{0}}\\]
What does the array look like **after the {{1}} merge**? *(Indices start at 0. A merge in which nothing moves also counts.)*`,
    notArisingText: `We sort the following array in ascending order using **top-down merge sort** (the recursive version):
\\[{{0}}\\]
Which of the following arrays can **not** occur after some merge during the sorting?`,
    prompt: "Array:",
    bottomText: "Separate the elements with spaces.",
    validationOnlyLetters: "Please only enter letters.",
    validationOnlyNumbers: "Please only enter whole numbers.",
    validationLength: "Please enter exactly {{0}} elements (you entered {{1}}).",
    invariantHint:
      "**Hint:** Merge sort finishes the left half completely before it touches the right half. So after each merge, the merged part is sorted, and everything to the right of it is still exactly as in the input.",
    merge: "Merge",
    subarray: "Subarray",
    array: "Array",
    start: "Start",
  },
  de: {
    name: "Merge Sort",
    description: "Die Schritte von Top-down Merge Sort nachvollziehen",
    stateAfterText: `Wir sortieren das folgende Array aufsteigend mit **Top-down Merge Sort**:
\\[{{0}}\\]
Wie sieht das Array **nach dem {{1}} Merge** aus? *(Die Indizes beginnen bei 0. Ein Merge, bei dem sich nichts bewegt, zählt auch.)*`,
    notArisingText: `Wir sortieren das folgende Array aufsteigend mit **Top-down Merge Sort** (die rekursive Variante):
\\[{{0}}\\]
Welches der folgenden Arrays kann **nicht** nach einem Merge während des Sortierens auftreten?`,
    prompt: "Array:",
    bottomText: "Trenne die Elemente durch Leerzeichen.",
    validationOnlyLetters: "Bitte gib nur Buchstaben ein.",
    validationOnlyNumbers: "Bitte gib nur ganze Zahlen ein.",
    validationLength: "Bitte gib genau {{0}} Elemente ein (du hast {{1}} eingegeben).",
    invariantHint:
      "**Tipp:** Merge Sort sortiert die linke Hälfte vollständig, bevor die rechte Hälfte angefasst wird. Nach jedem Merge ist der gemischte Teil also sortiert, und alles rechts davon steht noch genau so da wie in der Eingabe.",
    merge: "Merge",
    subarray: "Teilarray",
    array: "Array",
    start: "Start",
  },
}

export const mergeSortGenerator: QuestionGenerator = {
  id: "mergesort",
  name: tFunctional(translations, "name"),
  description: tFunctional(translations, "description"),
  tags: ["sorting", "merge sort"],
  languages: ["en", "de"],
  expectedParameters: [
    {
      type: "string",
      name: "variant",
      allowedValues: ["stateafter", "notarising"],
    },
  ],

  generate: (lang = "en", parameters, seed) => {
    const permalink = serializeGeneratorCall({
      generator: mergeSortGenerator,
      lang,
      parameters,
      seed,
    })

    const random = new Random(seed)
    const variant = parameters.variant as Variant

    if (variant === "stateafter") {
      return generateStateAfterSteps(lang, random, permalink)
    } else {
      return generateNotArising(lang, random, permalink)
    }
  },
}

/* ------------------------------------------------------------------------ */
/* Variant 1: "stateafter" (free text)                                       */
/* ------------------------------------------------------------------------ */

/**
 * Shows an input array and asks for the array after the k-th merge.
 * The student types the array, e.g. "A E M R X" or "AEMRX".
 */
function generateStateAfterSteps(lang: Language, random: Random, permalink: string) {
  const kind: InputKind = random.choice(["letters", "numbers"] as const)
  const length = random.int(6, 8)
  // ask for the state after the 3rd, 4th or 5th merge (the first merges only
  // combine two single elements, which is too easy). An array of length n has
  // n - 1 merges and the last one always gives the sorted array, so k <= n - 2.
  const k = random.int(3, Math.min(5, length - 2))

  // We want an input where:
  // - the state after k merges is not sorted yet (otherwise it is too easy)
  // - something moves in the k-th merge, so the answer differs from the state
  //   after k-1 merges (the student must really do merge k)
  const input = generateUnsortedInput({
    random,
    length,
    kind,
    isUsable: (a) => {
      const passes = mergeSort(a)
      return !isSorted(passes[k - 1]) && !arraysEqual(passes[k - 1], passes[k - 2])
    },
  })

  const steps = mergeSortTrace(input)
  const solution = steps[k - 1].state // steps[0] is the state after the 1st merge

  const checkFormat: FreeTextFormatFunction = ({ text }) => {
    if (text.trim() === "") return { valid: false }
    const userArray = parseArrayInput(text, kind)
    if (userArray === null) {
      return {
        valid: false,
        message: t(
          translations,
          lang,
          kind === "letters" ? "validationOnlyLetters" : "validationOnlyNumbers",
        ),
      }
    }
    if (userArray.length !== input.length) {
      return {
        valid: false,
        message: t(translations, lang, "validationLength", [
          String(input.length),
          String(userArray.length),
        ]),
      }
    }
    return { valid: true }
  }

  const feedback: FreeTextFeedbackFunction = ({ text }) => {
    const userArray = parseArrayInput(text, kind)
    if (userArray !== null && arraysEqual(userArray, solution)) {
      return { correct: true }
    }
    return {
      correct: false,
      correctAnswer: `$${arrayToTex(solution)}$`,
      feedbackText:
        t(translations, lang, "invariantHint") +
        "\n" +
        buildMergeTraceTable(input, steps.slice(0, k), lang),
    }
  }

  const question: FreeTextQuestion = {
    type: "FreeTextQuestion",
    name: mergeSortGenerator.name(lang),
    path: permalink,
    text: t(translations, lang, "stateAfterText", [arrayToTex(input), ordinal(k, lang)]),
    prompt: t(translations, lang, "prompt"),
    placeholder: kind === "letters" ? "A B C ..." : "3 14 27 ...",
    bottomText: t(translations, lang, "bottomText"),
    checkFormat,
    feedback,
  }
  return { question }
}

/* ------------------------------------------------------------------------ */
/* Variant 2: "notarising" (single choice)                                   */
/* ------------------------------------------------------------------------ */

/** Number of answer options shown to the student (1 fake + 3 real) */
const NUM_OPTIONS = 4

/** The two typical mistakes that the fake answer can come from */
type Mistake = "bottomUp" | "rightFirst"

/**
 * Shows an input array and 4 arrays. Three of them really occur during
 * top-down merge sort, one does not. The student selects the one that can
 * NOT occur (this is the correct answer). It comes from one of the two
 * mistakes.
 */
function generateNotArising(lang: Language, random: Random, permalink: string) {
  const kind: InputKind = random.choice(["letters", "numbers"] as const)
  const length = random.int(7, 8)
  const mistake: Mistake = random.choice(["bottomUp", "rightFirst"] as const)

  // we need at least 3 real intermediate states and at least 1 fake from
  // the chosen mistake
  const input = generateUnsortedInput({
    random,
    length,
    kind,
    isUsable: (a) =>
      realIntermediateStates(a, mergeSort).length >= NUM_OPTIONS - 1 &&
      fakeStates(a, mistake).length >= 1,
  })

  const steps = mergeSortTrace(input)
  const fake = random.choice(fakeStates(input, mistake))
  const reals = random.subset(realIntermediateStates(input, mergeSort), NUM_OPTIONS - 1)

  // put the fake at a random position between the real ones
  const correctAnswerIndex = random.int(0, NUM_OPTIONS - 1)
  const options = random.shuffle(reals)
  options.splice(correctAnswerIndex, 0, fake)

  const question: MultipleChoiceQuestion = {
    type: "MultipleChoiceQuestion",
    name: mergeSortGenerator.name(lang),
    path: permalink,
    text: t(translations, lang, "notArisingText", [arrayToTex(input)]),
    answers: options.map((state) => `$${arrayToTex(state)}$`),
    allowMultiple: false,
    feedback: minimalMultipleChoiceFeedback({
      correctAnswerIndex,
      feedbackText:
        t(translations, lang, "invariantHint") + "\n" + buildMergeTraceTable(input, steps, lang),
    }),
  }
  return { question }
}

/**
 * Builds all arrays that come from the given mistake and do NOT occur during
 * top-down merge sort (and are not sorted). No duplicates.
 */
function fakeStates(input: SortValue[], mistake: Mistake): SortValue[][] {
  // every state that occurs (including the input and the sorted array)
  const used = new Set<string>([arrayToKey(input), ...mergeSort(input).map(arrayToKey)])
  const fakes: SortValue[][] = []

  const candidates = mistake === "bottomUp" ? bottomUpStates(input) : rightFirstStates(input)
  for (const candidate of candidates) {
    const key = arrayToKey(candidate)
    if (!used.has(key) && !isSorted(candidate)) {
      fakes.push(candidate)
      used.add(key)
    }
  }
  return fakes
}

/**
 * Mistake 1: bottom-up merge sort (MergeBU.java in algs4). It merges
 * subarrays of size 1, then 2, then 4, ... from left to right.
 */
function bottomUpStates(input: SortValue[]): SortValue[][] {
  const a = [...input]
  const aux: SortValue[] = new Array<SortValue>(a.length)
  const n = a.length
  const states: SortValue[][] = []
  for (let len = 1; len < n; len *= 2) {
    for (let lo = 0; lo < n - len; lo += len + len) {
      const mid = lo + len - 1
      const hi = Math.min(lo + len + len - 1, n - 1)
      merge(a, aux, lo, mid, hi)
      states.push([...a])
    }
  }
  return states
}

/**
 * Mistake 2: top-down merge sort, but the right half is sorted before the
 * left half.
 */
function rightFirstStates(input: SortValue[]): SortValue[][] {
  const a = [...input]
  const aux: SortValue[] = new Array<SortValue>(a.length)
  const states: SortValue[][] = []

  function sort(lo: number, hi: number) {
    if (hi <= lo) return
    const mid = lo + Math.floor((hi - lo) / 2)
    sort(mid + 1, hi) // wrong: the right half first
    sort(lo, mid)
    merge(a, aux, lo, mid, hi)
    states.push([...a])
  }

  sort(0, a.length - 1)
  return states
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

/**
 * Builds a markdown table with the input and the array after each merge,
 * shown as feedback after a wrong answer. Unlike buildTraceTable in utils.ts
 * it has an extra column with the merged subarray, e.g. a[0..3], because for
 * merge sort it is hard to follow the steps without knowing which part was
 * merged.
 */
function buildMergeTraceTable(
  input: SortValue[],
  steps: MergeStep<SortValue>[],
  lang: Language,
): string {
  let table = `\n|${t(translations, lang, "merge")}|${t(translations, lang, "subarray")}|${t(translations, lang, "array")}|\n|===|===|===|\n`
  table += `|${t(translations, lang, "start")}| |$${arrayToTex(input)}$|\n`
  steps.forEach((step, index) => {
    table += `|${index + 1}|$a[${step.lo}..${step.hi}]$|$${arrayToTex(step.state)}$|\n`
  })
  return table
}