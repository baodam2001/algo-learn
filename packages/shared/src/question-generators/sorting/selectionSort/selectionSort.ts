export function selectionSort<T extends number | string>(input: T[]): T[][] {
    const a = [...input];        // create a copy of caller's array so caller's array remains unchanged
    const passes: T[][] = [];       // 2D array to store snapshots
    const n = a.length

    for (let i = 0; i < n; i++) {
        let min = i;
        for (let j = i + 1; j < n; j++) {
            if (less(a[j], a[min])) {
                min = j                     // find and reset the min value
            }
        };
        exch(a, i, min);            // swap a[i] with the min found above          
        passes.push([...a]);        // record a snapshot after each pass
    }

    return passes;
}

// helper: whether v < w?
function less<T extends number | string>(v: T, w: T): boolean {
    return v < w;
}

// helper: exchange a[i] and a[j]
// use a more concise JavaScript feature to swap 2 elements in an array
function exch<T>(a: T[], i: number, j: number): void {
    [a[i], a[j]] = [a[j], a[i]];
}