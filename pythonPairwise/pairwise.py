from Bio import pairwise2
from Bio.pairwise2 import format_alignment
from Bio import AlignIO
from Bio.Align import AlignInfo
from Bio import SeqIO
from Bio import Seq
from Bio.SeqRecord import SeqRecord
from Bio.Align import MultipleSeqAlignment
import sys, os

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
# padding sequences:
input_file = sys.argv[2];
records = SeqIO.parse(input_file, 'fasta')
records = list(records) # make a copy, otherwise our generator
                        # is exhausted after calculating maxlen
maxlen = max(len(record.seq) for record in records)

# pad sequences so that they all have the same length
for record in records:
    if len(record.seq) != maxlen:
        sequence = str(record.seq).ljust(maxlen, '.')
        record.seq = Seq.Seq(sequence)
assert all(len(record.seq) == maxlen for record in records)

# write to temporary file and do alignment
output_file = '{}_padded.fasta'.format(os.path.splitext(input_file)[0])
with open(output_file, 'w') as f:
    SeqIO.write(records, f, 'fasta')
# Padded
alignment = AlignIO.read(output_file, "fasta")
summary_align = AlignInfo.SummaryInfo(alignment)
# ignore consensus for a while (only use it at the end to graphically display files)
# threshold is used in
threshold = float(sys.argv[3]);
consensus = summary_align.dumb_consensus(threshold)
# alignment.add_sequence("Reference", reference)
# print(alignment)
f = open("ref.fa", "w")
f.write(">Reference\n"+reference);
f.close()

reads


#refAlignment = pairwise2.align.globalxx(reference, consensus, gap_char="_", penalize_extend_when_opening=True);
#print(
#    str(refAlignment).split("Alignment(")[1].split(")")[0]
#)
#print("RestOfTheOutput:", end="");


#for read in reads:
#    algn = pairwise2.align.globalxx(consensus, read);
#    print(str(algn).split("Alignment(")[1].split(")")[0]);
