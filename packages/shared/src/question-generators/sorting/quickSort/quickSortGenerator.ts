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
  quickSort,
  quickSortTrace,
  type PartitionStep,
} from "@shared/question-generators/sorting/quickSort/quickSortAlgorithm.ts"
import {
  arraysEqual,
  arrayToKey,
  exch,
  generateUnsortedInput,
  isSorted,
  less,
  parseArrayInput,
  realIntermediateStates,
  type SortValue,
} from "@shared/question-generators/sorting/utils.ts"
import Random from "@shared/utils/random.ts"
import { t, tFunctional, type Translations } from "@shared/utils/translations.ts"

/** The two question types (variants) of this generator */
// one step = one call of partition(), "partitioning" is used in the text like in the exam
type Variant = "stateafter" | "notarising"

const translations: Translations = {
  en: {
    name: "Quicksort",
    description: "Trace the partitioning steps of quicksort",
    stateAfterText: `Here is an array during the execution of quicksort (as in [SW 2.3]):
\\[{{0}}\\]
The first element is {{1}} and will be used as the next partitioning element (also called pivot). Draw the state of the array after the next partitioning.`,
    notArisingText: `Here is an array before the execution of quicksort:
\\[{{0}}\\]
In every partitioning, the **first element of the subarray** that is partitioned is used as the partitioning element (also called pivot), so the first pivot is {{1}}. Which of the following arrays can **not** occur after some partitioning?`,
    prompt: "Array:",
    bottomText: "Separate the numbers with spaces or commas.",
    validationOnlyNumbers: "Please only enter whole numbers.",
    validationLength: "Please enter exactly {{0}} numbers (you entered {{1}}).",
    invariantHint:
      "**Hint:** After partitioning $a[lo..hi]$ with pivot $v$, $v$ is in its final place, everything to its left is $\\le v$ and everything to its right is $\\ge v$. Elements equal to $v$ stop both scans and are exchanged too. The left part is partitioned completely before the right part.",
    partition: "Partitioning",
    subarray: "Subarray",
    pivot: "Pivot",
    array: "Array",
    start: "Start",
  },
  de: {
    name: "Quicksort",
    description: "Die Partitionierungsschritte von Quicksort nachvollziehen",
    stateAfterText: `Hier ist ein Array während der Ausführung von Quicksort (wie in [SW 2.3]):
\\[{{0}}\\]
Das erste Element ist {{1}} und wird als nächstes Partitionierungselement (auch Pivot genannt) verwendet. Zeichne den Zustand des Arrays nach der nächsten Partitionierung.`,
    notArisingText: `Hier ist ein Array vor der Ausführung von Quicksort:
\\[{{0}}\\]
Bei jeder Partitionierung wird das **erste Element des Teilarrays**, das partitioniert wird, als Partitionierungselement (auch Pivot genannt) verwendet, das erste Pivot ist also {{1}}. Welches der folgenden Arrays kann **nicht** nach einer Partitionierung auftreten?`,
    prompt: "Array:",
    bottomText: "Trenne die Zahlen durch Leerzeichen oder Kommas.",
    validationOnlyNumbers: "Bitte gib nur ganze Zahlen ein.",
    validationLength: "Bitte gib genau {{0}} Zahlen ein (du hast {{1}} eingegeben).",
    invariantHint:
      "**Tipp:** Nach dem Partitionieren von $a[lo..hi]$ mit Pivot $v$ steht $v$ an seiner endgültigen Stelle, alles links davon ist $\\le v$ und alles rechts davon ist $\\ge v$. Elemente, die gleich $v$ sind, stoppen beide Scans und werden ebenfalls vertauscht. Der linke Teil wird vollständig partitioniert, bevor der rechte Teil drankommt.",
    partition: "Partitionierung",
    subarray: "Teilarray",
    pivot: "Pivot",
    array: "Array",
    start: "Start",
  },
}

/**
 * Like the exam: arrays of 8 to 10 numbers between 1 and 9, so there are
 * always duplicates (and sometimes elements equal to the pivot).
 */
const MIN_LENGTH = 8
const MAX_LENGTH = 10
const MAX_NUMBER = 9

export const quickSortGenerator: QuestionGenerator = {
  id: "quicksort",
  name: tFunctional(translations, "name"),
  description: tFunctional(translations, "description"),
  tags: ["sorting", "quicksort"],
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
      generator: quickSortGenerator,
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
 * Like the exam: shows an array with the pivot (the first element) in bold
 * and asks for the array after the next partitioning, i.e. one call of
 * partition() on the whole array.
 * The student types the array, e.g. "5 1 4 1 3" or "[5, 1, 4, 1, 3]".
 */
function generateStateAfterSteps(lang: Language, random: Random, permalink: string) {
  const length = random.int(MIN_LENGTH, MAX_LENGTH)

  // We want an input where the state after the partitioning:
  // - is not sorted yet (otherwise it is too easy)
  // - differs from the input (the student must really do the partitioning)
  const input = generateUnsortedInput({
    random,
    length,
    kind: "numbers",
    maxNumber: MAX_NUMBER,
    isUsable: (a) => {
      const after = quickSort(a)[0]
      return !isSorted(after) && !arraysEqual(after, a)
    },
  })

  const steps = quickSortTrace(input)
  const solution = steps[0].state // the state after the first (= next) partitioning

  const checkFormat: FreeTextFormatFunction = ({ text }) => {
    if (text.trim() === "") return { valid: false }
    const userArray = parseNumbers(text)
    if (userArray === null) {
      return { valid: false, message: t(translations, lang, "validationOnlyNumbers") }
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
    const userArray = parseNumbers(text)
    if (userArray !== null && arraysEqual(userArray, solution)) {
      return { correct: true }
    }
    return {
      correct: false,
      correctAnswer: `$${arrayToBracketTex(solution)}$`,
      feedbackText:
        t(translations, lang, "invariantHint") +
        "\n" +
        buildPartitionTraceTable(input, steps.slice(0, 1), lang),
    }
  }

  const question: FreeTextQuestion = {
    type: "FreeTextQuestion",
    name: quickSortGenerator.name(lang),
    path: permalink,
    text: t(translations, lang, "stateAfterText", [arrayToBracketTex(input, 0), String(input[0])]),
    prompt: t(translations, lang, "prompt"),
    placeholder: "5, 1, 4, ...",
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
type Mistake = "skipEqual" | "filter"

/**
 * Shows an input array and 4 arrays. Three of them really occur during
 * quicksort, one does not. The student selects the one that can NOT occur
 * (this is the correct answer). It comes from one of the two mistakes.
 */
function generateNotArising(lang: Language, random: Random, permalink: string) {
  const length = random.int(MIN_LENGTH, MAX_LENGTH)
  const mistake: Mistake = random.choice(["skipEqual", "filter"] as const)

  // We need at least 3 real intermediate states and at least 1 fake from
  // the chosen mistake. ("skipEqual" only gives a fake if an element equal
  // to the pivot changes the result, so not every input works for it.)
  const input = generateUnsortedInput({
    random,
    length,
    kind: "numbers",
    maxNumber: MAX_NUMBER,
    isUsable: (a) =>
      realIntermediateStates(a, quickSort).length >= NUM_OPTIONS - 1 &&
      fakeStates(a, quickSortTrace(a), mistake).length >= 1,
  })

  const steps = quickSortTrace(input)
  const fake = random.choice(fakeStates(input, steps, mistake))
  const reals = random.subset(realIntermediateStates(input, quickSort), NUM_OPTIONS - 1)

  // put the fake at a random position between the real ones
  const correctAnswerIndex = random.int(0, NUM_OPTIONS - 1)
  const options = random.shuffle(reals)
  options.splice(correctAnswerIndex, 0, fake)

  const question: MultipleChoiceQuestion = {
    type: "MultipleChoiceQuestion",
    name: quickSortGenerator.name(lang),
    path: permalink,
    text: t(translations, lang, "notArisingText", [arrayToBracketTex(input, 0), String(input[0])]),
    answers: options.map((state) => `$${arrayToBracketTex(state)}$`),
    allowMultiple: false,
    feedback: minimalMultipleChoiceFeedback({
      correctAnswerIndex,
      feedbackText:
        t(translations, lang, "invariantHint") + "\n" + buildPartitionTraceTable(input, steps, lang),
    }),
  }
  return { question }
}

/**
 * Builds all arrays that come from the given mistake and do NOT occur during
 * quicksort (and are not sorted). No duplicates.
 * The mistake is used instead of the correct partition() for ONE
 * partitioning, all earlier ones are done correctly.
 */
function fakeStates(
  input: SortValue[],
  steps: PartitionStep<SortValue>[],
  mistake: Mistake,
): SortValue[][] {
  // every state that occurs (including the input and the sorted array)
  const used = new Set<string>([arrayToKey(input), ...steps.map((step) => arrayToKey(step.state))])
  const fakes: SortValue[][] = []

  steps.forEach((step, index) => {
    const candidate = [...(index === 0 ? input : steps[index - 1].state)] // the real state before this step
    if (mistake === "skipEqual") {
      skipEqualPartition(candidate, step.lo, step.hi)
    } else {
      filterPartition(candidate, step.lo, step.hi)
    }
    const key = arrayToKey(candidate)
    if (!used.has(key) && !isSorted(candidate)) {
      fakes.push(candidate)
      used.add(key)
    }
  })
  return fakes
}

/**
 * Mistake 1: the partition() from Quick.java, but the scans use <= instead
 * of <, so they move PAST elements equal to the pivot instead of stopping.
 */
function skipEqualPartition(a: SortValue[], lo: number, hi: number): void {
  let i = lo
  let j = hi + 1
  const v = a[lo]
  while (true) {
    while (a[++i] <= v) {
      if (i === hi) break
    }
    while (v <= a[--j]) {
      if (j === lo) break
    }
    if (i >= j) break
    exch(a, i, j)
  }
  exch(a, lo, j)
}

/**
 * Mistake 2: "filter" partition. The smaller elements in their original
 * order, then the pivot, then the others in their original order.
 */
function filterPartition(a: SortValue[], lo: number, hi: number): void {
  const v = a[lo]
  const rest = a.slice(lo + 1, hi + 1)
  const result = [...rest.filter((x) => less(x, v)), v, ...rest.filter((x) => !less(x, v))]
  a.splice(lo, result.length, ...result)
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

/**
 * Turns the student's text into an array of numbers, or null if it contains
 * something else. Accepts "5 1 4", "5, 1, 4" and "[5, 1, 4]" (like the exam).
 */
function parseNumbers(text: string): SortValue[] | null {
  return parseArrayInput(text.replace(/[[\]]/g, " "), "numbers")
}

/**
 * Turns an array into LaTeX in the exam's style: [5, 1, 4, 1, 3].
 * The element at boldIndex (if given) is printed in bold, e.g. the pivot.
 */
function arrayToBracketTex(a: readonly SortValue[], boldIndex?: number): string {
  const items = a.map((x, i) => (i === boldIndex ? `\\mathbf{${x}}` : String(x)))
  return `[${items.join(", ")}]`
}

/**
 * Builds a markdown table with the input and the array after each
 * partitioning, shown as feedback after a wrong answer. The pivot is printed
 * in bold at its final position.
 */
function buildPartitionTraceTable(
  input: SortValue[],
  steps: PartitionStep<SortValue>[],
  lang: Language,
): string {
  const label = (key: string) => t(translations, lang, key)
  let table = `\n|${label("partition")}|${label("subarray")}|${label("pivot")}|${label("array")}|\n|===|===|===|===|\n`
  table += `|${label("start")}| | |$${arrayToBracketTex(input)}$|\n`
  steps.forEach((step, index) => {
    table += `|${index + 1}|$a[${step.lo}..${step.hi}]$|$${step.pivot}$|$${arrayToBracketTex(step.state, step.j)}$|\n`
  })
  return table
}