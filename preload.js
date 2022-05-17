const { shell } = require('electron');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');
// Reads
let shouldPorechop = true;
let useLastPorechopResult = false;
let skipCheckingComplementaryReads = false;
let readsFile = __dirname + "/chopped.fasta";
// Reference
let copy_pasteReference = true;
let reference = "";
// Code
let reads = [];
let readsNames = [];
let finalScoresIndexes = [];
let cachedReferenceLength;
// Parameters
let percentageFit = 0.0;
let fakeAlignment = 24;
let minimumReads = 5;

window.addEventListener('DOMContentLoaded', () => {
    // Porechop
    document.getElementById('openPorechop').addEventListener('click', () => {
        shell.openPath( path.join(__dirname, '/input') );
    })
    document.getElementById('shouldPorechop').addEventListener('change', () => {
        shouldPorechop = document.getElementById('shouldPorechop').checked;
        switchView("shouldNotPorechopSection", !shouldPorechop);
        if (shouldPorechop) switchView("lastPorechopResultSection", !shouldPorechop);
        else if (useLastPorechopResult) switchView("lastPorechopResultSection", useLastPorechopResult);
    })
    // Reads
    document.getElementById('useLastPorechopResult').addEventListener('change', () => {
        useLastPorechopResult = document.getElementById('useLastPorechopResult').checked;
        if (useLastPorechopResult) {
            switchView("lastPorechopResultSection", false);
        } else {
            switchView("lastPorechopResultSection", true);
        }
    })
    document.getElementById('readsFile').addEventListener('change', () => {
        readsFile = document.getElementById('readsFile').files[0].path;
    })
    // Reference
    document.getElementById('copy_paste').addEventListener('change', () => {
        copy_pasteReference = document.getElementById('copy_paste').checked;
        if (copy_pasteReference) {
            switchView("copyPasteSection", true);
            switchView("notCopyPasteSection", false);
        } else {
            document.getElementById('referenceSequence').value = "";
            switchView("copyPasteSection", false);
            switchView("notCopyPasteSection", true);
        }
    })
    document.getElementById('referenceSequence').addEventListener('change', () => {
        reference = document.getElementById('referenceSequence').value;
    })
    document.getElementById('referenceFile').addEventListener('change', () => {
        let refFile = document.getElementById('referenceFile').files[0].path;
        let refUnparsedContent = fs.readFileSync(refFile).toString().split("\n");
        reference = getReference(refUnparsedContent);
    })
    // Parameters
    document.getElementById('skipCheckingComplementaryReads').addEventListener('change', () => {
        skipCheckingComplementaryReads = document.getElementById('skipCheckingComplementaryReads').checked;
    })
    document.getElementById('fakeAlignment').addEventListener('change', () => {
        fakeAlignment = parseInt(document.getElementById('fakeAlignment').value);
    })
    document.getElementById('minimumReads').addEventListener('change', () => {
        minimumReads = parseInt(document.getElementById('minimumReads').value);
    })
    document.getElementById('percentageFit').addEventListener('change', () => {
        percentageFit = parseFloat(document.getElementById('percentageFit').value.toString().replaceAll(',', "."));
    })
    document.getElementById('submitButton').addEventListener('click', async () => {
        switchView("preSection", false);
        switchView('loadingScreen', true);
        finalScoresIndexes = [];
        percentageFit = document.getElementById('percentageFit').value === "" ? 0.0 : parseFloat(document.getElementById('percentageFit').value.toString().replaceAll(',', "."));
        setTimeout(() => {
            main();
        }, 100)
    })
    document.getElementById('backButton').addEventListener('click', () => {
        switchView("preSection", true);
        switchView("postSection", false);
    })
    document.getElementById('backButton2').addEventListener('click', () => {
        switchView("preSection", true);
        switchView("postSection", false);
        switchView('loadingScreen', false)
    })

})

let openResultsFolder = () => {
    shell.openPath( path.join(__dirname, '/results') );
}

let displayResults = () => {
    clearResults();
    let rows = [
        `Number of reads: <b>${reads.length}</b>`,
        `Number of scores: <b>${finalScoresIndexes.length}</b>`,
        `Percentage fit: <b>${percentageFit}</b>`,
        `Fake alignment: <b>${fakeAlignment}</b>`
    ];
    for (let row of rows) {
        addDivToResults(`<p>${row}</p>`)
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

let clearResults = () => {
    document.getElementById('resultsSection').innerHTML = "";
}

let addDivToResults = (d) => {
    document.getElementById('resultsSection').innerHTML += d;
}

let getReads = (unparsedReads) => {
    reads = [];
    readsNames = [];
    let currentSequence = "";
    for (let o of unparsedReads) {
        if (o.length === 0) continue;
        if (o[0] === ">" || (o[0] !== "G" && o[0] !== "A" && o[0] !== "T" && o[0] !== "C")) {
            if (readsNames.length > 0) reads.push(currentSequence);
            readsNames.push(o);
            currentSequence = "";
        } else {
            currentSequence += o;
        }
    }
    reads.push(currentSequence);
}

let switchView = (id, shown) => {
    document.getElementById(id).style.display = shown ? "unset" : "none";
}

let getReference = (fastaFileContent) => {
    fastaFileContent.shift();
    return fastaFileContent.join("");
}

let porechop = () => {
    return new Promise(async (resolve, reject) => {
        if (shouldPorechop) {
            clearResults();
            switchView("preSection", false);
            switchView('loadingScreen', false);
            switchView('postSection', true);
            addDivToResults(`<h1>Porechopping...</h1>`);
            setTimeout(() => {
                execSync(`python3 ${__dirname}/Porechop/porechop-runner.py -i ${__dirname}/input -o ${__dirname}/chopped.fasta`);
                clearResults();
                switchView("preSection", false);
                switchView('loadingScreen', true);
                switchView('postSection', false);
                setTimeout(() => {
                    return resolve();
                }, 100);
            }, 100)
        } else {
            return reject();
        }
    })
}

let addComplementaryReads = () => {
    let n = reads.length;
    for (let i = 0; i < n; i++) {
        let complementaryRead = reads[i].split("").reverse().join("")
            .replaceAll("T", "0")
            .replaceAll("C", "1")
            .replaceAll("A", "T")
            .replaceAll("G","C")
            .replaceAll("0", "A")
            .replaceAll("1", "G");
        reads.push(complementaryRead)
        let complementaryName = readsNames[i].split(" ");
        complementaryName[0] += "_complementary";
        readsNames.push(complementaryName.join(" "));
    }
}

let getPerfectReads = () => {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < reads.length; i++) {
            if (reads[i].includes(reference)) {
                finalScoresIndexes.push(i);
                percentageFit = 100;
            }
        }
        if (finalScoresIndexes.length > minimumReads) {
            displayResults();
            return resolve();
        } else {
            return reject();
        }
    })
}

let getMinimumReads = async () => {
    percentageFit = 100;
    while (finalScoresIndexes.length <= minimumReads && percentageFit > 5) {
        percentageFit -= 5;
        await sleep(10);
        getResultsMinimumPercentage();
        clearResults()
        displayResults();
        addDivToResults(`<p>Not enough results found... Lowering the percentage.</p>`);
    }
    displayResults();
    if (percentageFit < 10) {
        addDivToResults(`<p>Warning! The results have less than 10% fit</p>`)
    }
}

let main = () => {
    porechop().then(() => {
        performWorkflow();
    }).catch(() => {
        performWorkflow();
    })
}

let getResultsMinimumPercentage = () => {
    let tempReference = reference.split("");
    for (let i = 0; i < fakeAlignment; i++) tempReference.shift();
    tempReference = tempReference.join("");
    cachedReferenceLength = tempReference.length;
    for (let i = 0; i < reads.length; i++) {
        if (!finalScoresIndexes.includes(i)) {
            let comp = getComparison(tempReference, reads[i], percentageFit);
            if (comp) {
                finalScoresIndexes.push(i);
            }
        }
    }
}

let getComparison = (ref, read, percentage) => {
    // Potencjalna dziura w referencji
    // Potencjalna dziura w readzie
    // GATACACACAcGAGAGA
    // poślizg (maxymalna dlugosc dziury)
    // max 50 nukleotydow
    let mistakesAllowed = parseInt((ref.length * (100 - percentage)/100).toString());
    for (let i = 0; i < read.length - cachedReferenceLength + mistakesAllowed+1; i++) {
        let allowedMistakes = mistakesAllowed;
        for (let j = 0; j < ref.length; j++) {
            if (i+j > cachedReferenceLength || read[i+j] !== ref[j]) {
                allowedMistakes -= 1;
            }
            if (allowedMistakes < 0) break;
        }
        if (allowedMistakes >= 0) return true;
    }
    return false;
}

let splitRead = (read) => {
    let string = read;
    let re = /.{1,70}/g;
    let hits = [];
    // Iterate hits
    let match = null;
    do {
        match = re.exec(string);
        if(match) {
            hits.push(match[0]);
        }
    } while (match);
    return hits;
}

let finalizeResults = () => {
    displayResults();
    let dateOfCreation = new Date();
    let filename = `${__dirname}/results/${dateOfCreation.getFullYear()}-${dateOfCreation.getMonth()}-${dateOfCreation.getDate()}-${dateOfCreation.getHours()}-${dateOfCreation.getMinutes()}-${dateOfCreation.getSeconds()}_results.fasta`;
    let resultContent = "";
    for (let i of finalScoresIndexes) {
        let splittedRead = splitRead(reads[i]);
        if (readsNames[i] === ">") {
            resultContent += readsNames[i] + "\n";
        } else {
            resultContent += ">" + readsNames[i] + "\n";
        }
        for (let j of splittedRead) {
            resultContent += j + "\n";
        }
    }
    fs.writeFileSync(filename, resultContent);
    addDivToResults(`<p>Ended. Open your results here:</p><div class="button" id="openResults">Click!</div>`);
    document.getElementById('openResults').addEventListener('click', () => {
        openResultsFolder();
    })
    switchView('loadingScreen', false);
    switchView("postSection", true);
}

let performWorkflow = () => {
    let readsUnparsedContent = fs.readFileSync(readsFile).toString().split("\n");
    clearResults();
    getReads(readsUnparsedContent);
    if (!skipCheckingComplementaryReads) {
        addComplementaryReads();
    }
    if (percentageFit === 0.0) {
        getPerfectReads().then(() => {
            finalizeResults();
        }).catch(() => {
            getMinimumReads();
            finalizeResults();
        })
    } else {
        getResultsMinimumPercentage();
        finalizeResults();
    }
}