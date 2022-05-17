from Bio import pairwise2
from Bio.pairwise2 import format_alignment
import sys
assert(len(sys.argv) == 3);
reads = []
readsNames = []
readsUnparsed = "".join(open(sys.argv[2], "r").readlines()).split("\n");
currentSequence = ""
for line in readsUnparsed:
	if len(line) > 0:
		if line[0] == ">" or (line[0] != "G" and line[0] != "A" and line[0] != "T" and line[0] != "C"):
			if len(readsNames) > 0:
				reads.append(currentSequence);
			readsNames.append(line);
			currentSequence = "";
		else:
			currentSequence += line;
reads.append(currentSequence);


reference = sys.argv[1];
for read in reads:
    alignment = pairwise2.align.globalxx(sys.argv[1], read);
    print(str(alignment).split("Alignment(")[1].split(")")[0]);
