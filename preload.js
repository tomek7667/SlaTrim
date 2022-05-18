const { shell } = require('electron');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');
// Reads
let shouldPorechop = true;
let useLastPorechopResult = false;
let skipCheckingComplementaryReads = false;
let readsFile = __dirname + "/chopped.fastq";
// Reference
let copy_pasteReference = true;
let reference = "";
// Code
let lastFilepathResult_fasta = "";
let lastFilepathResult_fastq = "";
let reads = [];
let readsNames = [];
let fastQFooter = [];
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
    let i = 0;
    while (i < unparsedReads.length) {
        if (unparsedReads[i].trim() === "") {
            i++;
            continue;
        }
        readsNames.push(unparsedReads[i].trim());
        i++;
        reads.push(unparsedReads[i].trim());
        i+=2; // Skips plus sign
        fastQFooter.push(unparsedReads[i].trim())
        i++;
    }
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
                execSync(`python3 ${__dirname}/Porechop/porechop-runner.py -i ${__dirname}/input -o ${__dirname}/chopped.fastq`);
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

let finalizeResults = () => {
    displayResults();
    let dateOfCreation = new Date();
    let filenameFasta = `${__dirname}/results/${dateOfCreation.getFullYear()}-${dateOfCreation.getMonth()}-${dateOfCreation.getDate()}_${dateOfCreation.getHours()}_${dateOfCreation.getMinutes()}_${dateOfCreation.getSeconds()}_resultsMatchingRef.fasta`;
    let filenameFastq = `${__dirname}/results/${dateOfCreation.getFullYear()}-${dateOfCreation.getMonth()}-${dateOfCreation.getDate()}_${dateOfCreation.getHours()}_${dateOfCreation.getMinutes()}_${dateOfCreation.getSeconds()}_resultsMatchingRef.fastq`;
    let resultContent_fasta = "";
    let resultContent_fastq = "";
    for (let i of finalScoresIndexes) {
        let splittedRead = splitRead(reads[i]);
        if (readsNames[i][0] === ">") {
            resultContent_fasta += readsNames[i] + "\n";
        } else {
            resultContent_fasta += ">" + readsNames[i] + "\n";
        }
        for (let j of splittedRead) {
            resultContent_fasta += j + "\n";
        }
        resultContent_fastq += readsNames[i] + "\n";
        resultContent_fastq += reads[i] + "\n+\n";
        resultContent_fastq += fastQFooter[i] + "\n";
    }
    fs.writeFileSync(filenameFasta, resultContent_fasta);
    fs.writeFileSync(filenameFastq, resultContent_fastq);
    lastFilepathResult_fasta = filenameFasta;
    lastFilepathResult_fastq = filenameFastq;
    addDivToResults(`<p>You can open the results of before pairwising here:</p><div class="button" id="openResults">Open folder</div>`);
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
    addDivToResults(`<br><div class="button" id="pairwisingStartButton">Click here to continue (alignment)</div>`);
    document.getElementById('pairwisingStartButton').addEventListener('click', () => {
        addDivToResults(`<p>Starting pairwise2ing...</p>`);
        setTimeout(() => {
            performPairwise();
        }, 100)
    })
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
        /*try {
            alert("Python Bio module installation");
            let pip3output = execSync(`pip3 install bio`);
            if (pip3output.toString().includes("already")) {
                alert("Module already installed.")
            } else {
                alert("Module installed");
            }
        } catch (e) {
            alert("Failed installing Bio module.")
        }*/
        // let a = execSync(`python3 ${__dirname}/pythonPairwise/pairwise.py ${reference} ${lastFilepathResult_fasta} 0.7`,  { encoding: 'utf8' });

        let refDir = sequenceToFasta(reference, "Reference")
        let dateOfCreation = new Date();
        let fileName_sam = `${__dirname}/results/${dateOfCreation.getFullYear()}-${dateOfCreation.getMonth()}-${dateOfCreation.getDate()}_${dateOfCreation.getHours()}_${dateOfCreation.getMinutes()}_${dateOfCreation.getSeconds()}_resultsAligned.sam`;
        let commandLine = `${__dirname}/bwa/minimap2 -a ${refDir} ${lastFilepathResult_fastq} > ${fileName_sam}`;
        let a = execSync(commandLine);
        alert(commandLine);
        return;
        pairwised = a.toString().replaceAll("'", "").split("\n");
        if (process.platform === 'win32') {
            pairwised = a.toString().replaceAll("'", "").split("\r\n");
        }
        pairwised.pop(); // Last empty element
        pairwised = parsePairwised(pairwised);
        pairwised = filterGoodScore(pairwised);
        addPairwisedTable(pairwised);
    } catch (e) {
        console.log( e );
        alert(e);
        addDivToResults(`Pairwising failed`)
    }
}

let parsePairwised = (pws) => {
    let p = [];
    for (let pw of pws) {
        let i = pws.indexOf(pw);
        let pairwisedOne = {
            title: readsNames[i].replaceAll("\n", " ")
        };
        let before = pw.split(", ");
        for (let o of before) {
            let key = o.split("=")[0];
            pairwisedOne[key] = o.split("=")[1];
        }
        p.push(pairwisedOne);
    }
    return p;
}

let filterGoodScore = (pws) => {
    let filteredOut = [];
    for (let pw of pws) {
        if (pw.score >= minimumScore) filteredOut.push(pw);
    }
    return filteredOut;
}

let addPairwisedTable = (pws) => {
    switchView("loadingScreen", false);
    switchView("preSection", false);
    switchView("postSection", true);
    clearResults();
    let resultDiv = document.createElement("div");
    let resultTable = `<p>Reference</p><p>${reference}</p>`;
    resultDiv.innerHTML += resultTable;
    for (let pwObj of pws) {
        let seqA = pwObj.seqA.replaceAll("\n", "");
        let seqB = pwObj.seqB.replaceAll("\n", "");
        let readName = document.createElement("div");
        // readName.classList.add("readName");
        // readName.innerText = `Read: ${pwObj.title}<`;
        let comparisonDiv = document.createElement("div");
        comparisonDiv.classList.add("dnaSequence");
        comparisonDiv.innerHTML = `${seqA.replaceAll("-", "_")}<br>
${seqB.replaceAll("-", "_")}`
        //resultDiv.appendChild(readName);
        resultDiv.appendChild(comparisonDiv);
    }
    document.getElementById('resultsSection').appendChild(resultDiv);
}

let sequenceToFasta = (sequence, name) => {
    let date = new Date();
    let dateFileName = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}_${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}_${name}.fasta`;
    let resultPath = path.join(__dirname, `/results/${dateFileName}`);
    let splittedSequence = splitRead(sequence);
    let fileContent = `>${name}\n`;
    for (let seq of splittedSequence) {
        fileContent += `${seq}\n`;
    }
    fs.writeFileSync(resultPath, fileContent);
    return resultPath;
}

let splitRead = (read) => {
    let string = read;
    let re = /.{1,60}/g;
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