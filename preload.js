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
let lastFilepathResult = "";
let reads = [];
let readsNames = [];
let finalScoresIndexes = [];
let trimmedReads = [];
let trimmedReadsNames = [];
let cachedReferenceLength;
let pairwised;
// Parameters
// let percentageFit = 0.0;
let fakeAlignment = 0;
let minimumReads = 5;
let minimumScore = 0;
// TODO: Implement scoring system - higher score - more matcher - highest score === reference.length

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
        minimumScore = reference && reference.length === 0 ? parseInt(document.getElementById('minimumScore').value) : reference.length;
    })
    document.getElementById('referenceFile').addEventListener('change', () => {
        let refFile = document.getElementById('referenceFile').files[0].path;
        let refUnparsedContent = fs.readFileSync(refFile).toString().split("\n");
        reference = getReference(refUnparsedContent);
        minimumScore = reference && reference.length === 0 ? parseInt(document.getElementById('minimumScore').value) : reference.length;
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
    document.getElementById('minimumScore').addEventListener('change', () => {
        minimumScore = document.getElementById('minimumScore').value != '' ? parseInt(document.getElementById('minimumScore').value) : reference.length;
    })
    document.getElementById('submitButton').addEventListener('click', async () => {
        switchView("preSection", false);
        switchView('loadingScreen', true);
        finalScoresIndexes = [];
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
        `Fake alignment: <b>${fakeAlignment}</b>`
    ];
    for (let row of rows) {
        addDivToResults(`<p>${row}</p>`)
    }
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

// Deprecated
let getPerfectReads = () => {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < reads.length; i++) {
            if (reads[i].includes(reference)) {
                finalScoresIndexes.push(i);
                // percentageFit = 100;
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

// Deprecated
let getMinimumReads = async () => {
    // percentageFit = 100;
    /* while (finalScoresIndexes.length <= minimumReads && percentageFit > 5) {
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
    } */
}

// Deprecated
let getResultsMinimumPercentage = () => {
    let tempReference = reference.split("");
    for (let i = 0; i < fakeAlignment; i++) tempReference.shift();
    tempReference = tempReference.join("");
    cachedReferenceLength = tempReference.length;
    for (let i = 0; i < reads.length; i++) {
        if (!finalScoresIndexes.includes(i)) {
            /* let comp = getComparison(tempReference, reads[i], percentageFit);
            if (comp) {
                finalScoresIndexes.push(i);
            } */
        }
    }
}

// Deprecated
let getComparison = (ref, read, percentage) => {
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


let main = () => {
    porechop().then(() => {
        performWorkflow();
    }).catch(() => {
        performWorkflow();
    })
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
    let filename = `${__dirname}/results/${dateOfCreation.getFullYear()}-${dateOfCreation.getMonth()}-${dateOfCreation.getDate()}_${dateOfCreation.getHours()}_${dateOfCreation.getMinutes()}_${dateOfCreation.getSeconds()}_resultsMatchingRef.fasta`;
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
    lastFilepathResult = filename;
    addDivToResults(`<p>You can open the results of before pairwising here:</p><div class="button" id="openResults">Click!</div>`);
    setTimeout(() => {
        document.getElementById('openResults').addEventListener('click', () => {
            openResultsFolder();
        })
    }, 50)
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
    if (reference.length > 59) {
        preSelectionReads();
    } else {
        finalScoresIndexes = getMatchingReads(reference, reads);
    }
    getTrimmedReads();
    finalizeResults();
    addDivToResults(`<p>In 5 seconds, pairwise2 comparison will begin</p>`);
    setTimeout(() => {
        addDivToResults(`<p>Starting pairwise2ing...</p>`);
        setTimeout(() => {
            performPairwise();
        }, 100)
    }, 5000)
}

// Filling trimmed reads
let getTrimmedReads = () => {
    for (let i of finalScoresIndexes) {
        trimmedReads.push(reads[i]);
        trimmedReadsNames.push(readsNames[i]);
    }
}

// Filtering out reads that are for sure not matching
let preSelectionReads = () => {
    let splittedReference = reference.match(/.{1,20}/g);
    let tempResults = [];
    for (let i = 0; i < 3; i++) { // In my opinion (As a developer, here can be instead of 3, splittedReference - 1 (-1 because last can be smaller than 20)
        if (tempResults.length > minimumReads) break;
        tempResults.concat(getMatchingReads(splittedReference[i], reads));
    }
    finalScoresIndexes = [...new Set(tempResults)];
}

// Getting all reads that contain 'tempRef'
let getMatchingReads = (tempRef, tempReads) => {
    let matchingReadsIndexes = [];
    for (let i = 0; i < tempReads.length; i++) {
        if (tempReads[i].includes(tempRef)) {
            matchingReadsIndexes.push(i);
        }
    }
    return matchingReadsIndexes;
}

// Performing pairwise, if not working change 'python' to 'python3'
let performPairwise = () => {
    pairwised = [];
    try {
        let a = execSync(`python pairwise.py ${reference} ${lastFilepathResult}`);
        pairwised = a.toString().replaceAll('"', "").split("\r\n");
    } catch (e) {
        console.log( e );
        alert(e);
    }
    pairwised.pop();
    parsePairwised();
    addPairwisedTable();
}

let parsePairwised = () => {
    let p = [];
    for (let pw of pairwised) {
        let i = pairwised.indexOf(pw);
        let pairwisedOne = {
            title: readsNames[i]
        };
        let before = pw.split(", ");
        for (let o of before) {
            let key = o.split("=")[0];
            pairwisedOne[key] = o.split("=")[1].replaceAll("'", "");
        }
        p.push(pairwisedOne);
    }
    pairwised = p;
}

let addPairwisedTable = () => {
    switchView("loadingScreen", false);
    switchView("preSection", false);
    switchView("postSection", true);
    clearResults();
    let resultTable = `<p>Reference</p><p>${reference}</p>`;
    for (let pwObj of pairwised) {
        resultTable += `
<p>Read: <b>${pwObj.title}</b></p>
<div class="wrapper"><div class="leftCell">Reference</div><div class="rightCell">${pwObj.seqA}</div></div>
<div class="wrapper"><div class="leftCell">Read</div><div class="rightCell">${pwObj.seqB}</div></div>
`
    }
    // scroll should go with ref and read
    addDivToResults(resultTable)
}

