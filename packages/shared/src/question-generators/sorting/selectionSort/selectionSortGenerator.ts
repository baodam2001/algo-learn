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
import { selectionSort } from "@shared/question-generators/sorting/selectionSort/selectionSortAlgorithm.ts"
import {
  arraysEqual,
  arrayToKey,
  arrayToTex,
  buildTraceTable,        
  exch,
  generateUnsortedInput,
  isSorted,
  less,
  ordinal,
  parseArrayInput,        
  realIntermediateStates, 
  type InputKind,
  type SortValue,
  type TraceTableLabels,  
} from "@shared/question-generators/sorting/utils.ts"
import Random from "@shared/utils/random.ts"
import { t, tFunctional, type Translations } from "@shared/utils/translations.ts"

/** The two question types (variants) of this generator */
type Variant = "stateafter" | "notarising"

const translations: Translations = {
  en: {
    name: "Selection Sort",
    description: "Trace the steps of selection sort",
    stateAfterText: `We sort the following array in ascending order using **selection sort** (in iteration $i$ of the outer loop, the smallest element of $a[i..n-1]$ is exchanged with $a[i]$):
\\[{{0}}\\]
What does the array look like **after the {{1}} exchange**? *(An exchange of an element with itself also counts.)*`,
    notArisingText: `We sort the following array in ascending order using **selection sort**:
\\[{{0}}\\]
Which of the following arrays can **not** occur after some exchange during the sorting? *Select all that apply.*`,
    prompt: "Array:",
    bottomText: "Separate the elements with spaces.",
    validationOnlyLetters: "Please only enter letters.",
    validationOnlyNumbers: "Please only enter whole numbers.",
    validationLength: "Please enter exactly {{0}} elements (you entered {{1}}).",
    exchange: "Exchange",
    array: "Array",
    start: "Start",
  },
  de: {
    name: "Selection Sort",
    description: "Die Schritte von Selection Sort nachvollziehen",
    stateAfterText: `Wir sortieren das folgende Array aufsteigend mit **Selection Sort** (in Iteration $i$ der äußeren Schleife wird das kleinste Element von $a[i..n-1]$ mit $a[i]$ vertauscht):
\\[{{0}}\\]
Wie sieht das Array **nach dem {{1}} Austausch** aus? *(Ein Austausch eines Elements mit sich selbst zählt auch.)*`,
    notArisingText: `Wir sortieren das folgende Array aufsteigend mit **Selection Sort**:
\\[{{0}}\\]
Welche der folgenden Arrays können **nicht** nach einem Austausch während des Sortierens auftreten? *Wähle alle zutreffenden aus.*`,
    prompt: "Array:",
    bottomText: "Trenne die Elemente durch Leerzeichen.",
    validationOnlyLetters: "Bitte gib nur Buchstaben ein.",
    validationOnlyNumbers: "Bitte gib nur ganze Zahlen ein.",
    validationLength: "Bitte gib genau {{0}} Elemente ein (du hast {{1}} eingegeben).",
    exchange: "Austausch",
    array: "Array",
    start: "Start",
  },
}

export const selectionSortGenerator: QuestionGenerator = {
  id: "selectsort",
  name: tFunctional(translations, "name"),
  description: tFunctional(translations, "description"),
  tags: ["sorting", "selection sort"],
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
      generator: selectionSortGenerator,
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
 * Shows an input array and asks for the array after the k-th exchange.
 * The student types the array, e.g. "A E M R X" or "AEMRX".
 */
function generateStateAfterSteps(lang: Language, random: Random, permalink: string) {
  const kind: InputKind = random.choice(["letters", "numbers"] as const)
  const length = random.int(6, 8)
  const k = random.int(2, 4) // ask for the state after the 2nd, 3rd or 4th exchange

  // We want an input where:
  // - the state after k exchanges is not sorted yet (otherwise it is too easy)
  // - the k-th exchange is not an exchange with itself, so the answer differs
  //   from the state after k-1 exchanges (the student must really do step k)
  const input = generateUnsortedInput({
    random,
    length,
    kind,
    isUsable: (a) => {
      const passes = selectionSort(a)
      const before = k >= 2 ? passes[k - 2] : a
      return !isSorted(passes[k - 1]) && !arraysEqual(passes[k - 1], before)
    },
  })

  const passes = selectionSort(input)
  const solution = passes[k - 1] // passes[0] is the state after the 1st exchange

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
      feedbackText: buildTraceTable(input, passes.slice(0, k), traceLabels(lang)),
    }
  }

  const question: FreeTextQuestion = {
    type: "FreeTextQuestion",
    name: selectionSortGenerator.name(lang),
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
/* Variant 2: "notarising" (multiple choice)                                 */
/* ------------------------------------------------------------------------ */

/** Number of answer options shown to the student */
const NUM_OPTIONS = 5

/**
 * Shows an input array and 5 arrays. Some of them really occur during
 * selection sort, the others do not. The student selects all arrays that can
 * NOT occur (these are the "correct" answers).
 */
function generateNotArising(lang: Language, random: Random, permalink: string) {
  const kind: InputKind = random.choice(["letters", "numbers"] as const)
  const length = random.int(7, 8)

  // we need at least NUM_OPTIONS - 1 real intermediate states, so that there
  // can be up to 4 "real" options next to at least 1 "fake" option
  const input = generateUnsortedInput({
    random,
    length,
    kind,
    isUsable: (a) => realIntermediateStates(a, selectionSort).length >= NUM_OPTIONS - 1,
  })

  const passes = selectionSort(input)
  const real = realIntermediateStates(input, selectionSort)

  // every state that occurs (including the input and the sorted array),
  // stored as strings so that we can check "does this array occur?" quickly
  const occurring = new Set<string>([arrayToKey(input), ...passes.map(arrayToKey)])

  const numFake = random.int(1, 3)
  const numReal = NUM_OPTIONS - numFake

  const fakes = generateFakeStates(input, real, occurring, numFake, random)
  const reals = random.subset(real, numReal)

  // mix real and fake options and remember which ones are fake
  const options = random.shuffle([
    ...reals.map((state) => ({ state, occurs: true })),
    ...fakes.map((state) => ({ state, occurs: false })),
  ])

  const correctAnswerIndex: number[] = []
  options.forEach((option, index) => {
    if (!option.occurs) correctAnswerIndex.push(index)
  })

  const question: MultipleChoiceQuestion = {
    type: "MultipleChoiceQuestion",
    name: selectionSortGenerator.name(lang),
    path: permalink,
    text: t(translations, lang, "notArisingText", [arrayToTex(input)]),
    answers: options.map((option) => `$${arrayToTex(option.state)}$`),
    allowMultiple: true,
    feedback: minimalMultipleChoiceFeedback({
      correctAnswerIndex,
      feedbackText: buildTraceTable(input, passes, traceLabels(lang)),
    }),
  }
  return { question }
}

/**
 * Builds arrays that look plausible but do NOT occur during selection sort.
 * They come from typical mistakes:
 * 1. selecting the maximum and moving it to the end (wrong direction)
 * 2. shifting the minimum to the front instead of exchanging it
 * 3. a real state with two neighbouring elements swapped
 */
function generateFakeStates(
  input: SortValue[],
  real: SortValue[][],
  occurring: Set<string>,
  count: number,
  random: Random,
): SortValue[][] {
  const fakes: SortValue[][] = []
  const used = new Set<string>(occurring)

  /** Adds the candidate if it is new, unsorted and does not occur */
  function tryAdd(candidate: SortValue[]) {
    const key = arrayToKey(candidate)
    if (fakes.length < count && !used.has(key) && !isSorted(candidate)) {
      fakes.push(candidate)
      used.add(key)
    }
  }

  // mistakes 1 and 2, in random order
  const mistakeStates = random.shuffle([...maxToEndStates(input), ...shiftMinStates(input)])
  for (const candidate of mistakeStates) tryAdd(candidate)

  // mistake 3: fill up with slightly changed real states
  for (let attempt = 0; attempt < 100 && fakes.length < count; attempt++) {
    const candidate = [...random.choice(real)]
    const j = random.int(0, candidate.length - 2)
    if (candidate[j] !== candidate[j + 1]) {
      exch(candidate, j, j + 1)
      tryAdd(candidate)
    }
  }

  return fakes
}

/** Mistake 1: selection sort that moves the maximum to the end in each pass */
function maxToEndStates(input: SortValue[]): SortValue[][] {
  const a = [...input]
  const states: SortValue[][] = []
  for (let end = a.length - 1; end > 0; end--) {
    let max = 0
    for (let j = 1; j <= end; j++) {
      if (less(a[max], a[j])) max = j
    }
    exch(a, max, end)
    states.push([...a])
  }
  return states
}

/** Mistake 2: the minimum is shifted to position i (like insertion), not exchanged */
function shiftMinStates(input: SortValue[]): SortValue[][] {
  const a = [...input]
  const states: SortValue[][] = []
  for (let i = 0; i < a.length; i++) {
    let min = i
    for (let j = i + 1; j < a.length; j++) {
      if (less(a[j], a[min])) min = j
    }
    // move a[min] to the front by shifting a[i..min-1] one position right
    for (let j = min; j > i; j--) exch(a, j, j - 1)
    states.push([...a])
  }
  return states
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

/** The translated labels for the trace table in the feedback */
function traceLabels(lang: Language): TraceTableLabels {
  return {
    step: t(translations, lang, "exchange"),
    array: t(translations, lang, "array"),
    start: t(translations, lang, "start"),
  }
}

