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
import { insertionSort } from "@shared/question-generators/sorting/insertionSort/insertionSortAlgorithm.ts"
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
// one pass = one outer loop, "outer loop" is used in the text to make consistent questions for students
type Variant = "stateafter" | "notarising"

const translations: Translations = {
  en: {
    name: "Insertion Sort",
    description: "Trace the steps of insertion sort",
    stateAfterText: `We sort the following array in ascending order using **insertion sort** (in iteration $i$ of the outer loop, $a[i]$ is moved to the left by exchanges until the element on its left is not larger):
\\[{{0}}\\]
What does the array look like **after the {{1}} iteration** of the outer loop? *(Indices start at 0. The outer loop starts at $i = 1$. An iteration in which nothing moves also counts.)*`,
    notArisingText: `We sort the following array in ascending order using **insertion sort**:
\\[{{0}}\\]
Which of the following arrays can **not** occur after some iteration of the outer loop during the sorting?`,
    prompt: "Array:",
    bottomText: "Separate the elements with spaces.",
    validationOnlyLetters: "Please only enter letters.",
    validationOnlyNumbers: "Please only enter whole numbers.",
    validationLength: "Please enter exactly {{0}} elements (you entered {{1}}).",
    invariantHint:
      "**Hint:** after the $k$-th iteration, the first $k+1$ elements are sorted and all other elements are still in their original place.",
    pass: "Iteration",
    array: "Array",
    start: "Start",
  },
  de: {
    name: "Insertion Sort",
    description: "Die Schritte von Insertion Sort nachvollziehen",
    stateAfterText: `Wir sortieren das folgende Array aufsteigend mit **Insertion Sort** (in Iteration $i$ der äußeren Schleife wird $a[i]$ durch Vertauschungen nach links bewegt, bis das Element links davon nicht größer ist):
\\[{{0}}\\]
Wie sieht das Array **nach der {{1}} Iteration** der äußeren Schleife aus? *(Die Indizes beginnen bei 0. Die äußere Schleife beginnt bei $i = 1$. Eine Iteration, in der sich nichts bewegt, zählt auch.)*`,
    notArisingText: `Wir sortieren das folgende Array aufsteigend mit **Insertion Sort**:
\\[{{0}}\\]
Welches der folgenden Arrays kann **nicht** nach einer Iteration der äußeren Schleife während des Sortierens auftreten?`,
    prompt: "Array:",
    bottomText: "Trenne die Elemente durch Leerzeichen.",
    validationOnlyLetters: "Bitte gib nur Buchstaben ein.",
    validationOnlyNumbers: "Bitte gib nur ganze Zahlen ein.",
    validationLength: "Bitte gib genau {{0}} Elemente ein (du hast {{1}} eingegeben).",
    invariantHint:
      "**Tipp:** Nach der $k$-ten Iteration sind die ersten $k+1$ Elemente sortiert und alle anderen Elemente stehen noch an ihrer ursprünglichen Stelle.",
    pass: "Iteration",
    array: "Array",
    start: "Start",
  },
}

export const insertionSortGenerator: QuestionGenerator = {
  id: "insertsort",
  name: tFunctional(translations, "name"),
  description: tFunctional(translations, "description"),
  tags: ["sorting", "insertion sort"],
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
      generator: insertionSortGenerator,
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
 * Shows an input array and asks for the array after the k-th pass of the
 * outer loop. The student types the array, e.g. "A E M R X" or "AEMRX".
 */
function generateStateAfterSteps(lang: Language, random: Random, permalink: string) {
  const kind: InputKind = random.choice(["letters", "numbers"] as const)
  const length = random.int(6, 8)
  const k = random.int(2, 4) // ask for the state after the 2nd, 3rd or 4th pass

  // We want an input where:
  // - the state after k passes is not sorted yet (otherwise it is too easy)
  // - something moves in the k-th pass, so the answer differs from the state
  //   after k-1 passes (the student must really do pass k)
  const input = generateUnsortedInput({
    random,
    length,
    kind,
    isUsable: (a) => {
      const passes = insertionSort(a)
      const before = k >= 2 ? passes[k - 2] : a
      return !isSorted(passes[k - 1]) && !arraysEqual(passes[k - 1], before)
    },
  })

  const passes = insertionSort(input)
  const solution = passes[k - 1] // passes[0] is the state after the 1st pass

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
        buildTraceTable(input, passes.slice(0, k), traceLabels(lang)),
    }
  }

  const question: FreeTextQuestion = {
    type: "FreeTextQuestion",
    name: insertionSortGenerator.name(lang),
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

/** The three typical mistakes that the fake answer can come from */
type Mistake = "selection" | "wrongEnd" | "stopEarly"

/**
 * Shows an input array and 4 arrays. Three of them really occur during
 * insertion sort, one does not. The student selects the one that can NOT
 * occur (this is the correct answer). It comes from one of the three
 * mistakes, chosen at random.
 */
function generateNotArising(lang: Language, random: Random, permalink: string) {
  const kind: InputKind = random.choice(["letters", "numbers"] as const)
  const length = random.int(7, 8)
  const mistake: Mistake = random.choice(["selection", "wrongEnd", "stopEarly"] as const)

  // we need at least 3 real intermediate states and at least 1 fake from
  // the chosen mistake
  const input = generateUnsortedInput({
    random,
    length,
    kind,
    isUsable: (a) =>
      realIntermediateStates(a, insertionSort).length >= NUM_OPTIONS - 1 &&
      fakeStates(a, mistake).length >= 1,
  })

  const passes = insertionSort(input)
  const fake = random.choice(fakeStates(input, mistake))
  const reals = random.subset(realIntermediateStates(input, insertionSort), NUM_OPTIONS - 1)

  // put the fake at a random position between the real ones
  const correctAnswerIndex = random.int(0, NUM_OPTIONS - 1)
  const options = random.shuffle(reals)
  options.splice(correctAnswerIndex, 0, fake)

  const question: MultipleChoiceQuestion = {
    type: "MultipleChoiceQuestion",
    name: insertionSortGenerator.name(lang),
    path: permalink,
    text: t(translations, lang, "notArisingText", [arrayToTex(input)]),
    answers: options.map((state) => `$${arrayToTex(state)}$`),
    allowMultiple: false,
    feedback: minimalMultipleChoiceFeedback({
      correctAnswerIndex,
      feedbackText:
        t(translations, lang, "invariantHint") +
        "\n" +
        buildTraceTable(input, passes, traceLabels(lang)),
    }),
  }
  return { question }
}

/**
 * Builds all arrays that come from the given mistake and do NOT occur during
 * insertion sort (and are not sorted). No duplicates.
 * 1. selection: using selection sort instead of insertion sort
 * 2. wrongEnd: sorting from the wrong end (the sorted part grows from the right)
 * 3. stopEarly: stopping the insertion one position too early
 */
function fakeStates(input: SortValue[], mistake: Mistake): SortValue[][] {
  const passes = insertionSort(input)
  // every state that occurs (including the input and the sorted array)
  const used = new Set<string>([arrayToKey(input), ...passes.map(arrayToKey)])
  const fakes: SortValue[][] = []

  let candidates: SortValue[][]
  if (mistake === "selection") {
    candidates = selectionSort(input)
  } else if (mistake === "wrongEnd") {
    candidates = wrongEndStates(input)
  } else {
    candidates = stopEarlyStates(input)
  }

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
 * Mistake 2: insertion sort that builds the sorted part from the right end.
 * In each pass, a[i] is moved to the right until the element on its right is
 * not smaller.
 */
function wrongEndStates(input: SortValue[]): SortValue[][] {
  const a = [...input]
  const states: SortValue[][] = []
  for (let i = a.length - 2; i >= 0; i--) {
    for (let j = i; j < a.length - 1 && less(a[j + 1], a[j]); j++) {
      exch(a, j, j + 1)
    }
    states.push([...a])
  }
  return states
}

/**
 * Mistake 3: in each pass, the inserted element stops one position too early.
 * The fake state is recorded, then the pass is finished correctly, so that the
 * next pass starts from the real state again.
 */
function stopEarlyStates(input: SortValue[]): SortValue[][] {
  const a = [...input]
  const states: SortValue[][] = []
  for (let i = 1; i < a.length; i++) {
    // count how many positions a[i] would move to the left
    let moves = 0
    while (i - moves > 0 && less(a[i], a[i - moves - 1])) moves++

    // only interesting if it moves at least 2 positions: stopping one early
    // after a single move would give the (real) state before this pass - should it be a random of moves, probably no
    if (moves >= 2) {
      const fake = [...a]
      for (let j = i; j > i - moves + 1; j--) exch(fake, j, j - 1)
      states.push(fake)
    }

    // do the real pass
    for (let j = i; j > 0 && less(a[j], a[j - 1]); j--) exch(a, j, j - 1)
  }
  return states
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

/** The translated labels for the trace table in the feedback */
function traceLabels(lang: Language): TraceTableLabels {
  return {
    step: t(translations, lang, "pass"),
    array: t(translations, lang, "array"),
    start: t(translations, lang, "start"),
  }
}