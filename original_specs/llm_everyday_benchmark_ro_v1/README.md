# Everyday LLM Benchmark RO v1

Set sintetic de **1.000 de exemple** pentru evaluarea inițială a unui LLM mic pe utilizări conversaționale obișnuite.

## Distribuție

- **900 exemple scurte (90%)**: factualitate simplă, întrebări din domenii diferite, calcule, logică, vocabular, traducere, extracție, clasificare, reformulare, sumarizare, explicații și taskuri cotidiene.
- **90 exemple medii (9%)**: prompturi mai bogate, în general sub o pagină, cu răspunsuri de regulă sub o pagină.
- **10 exemple mai complexe (1%)**: taskuri cu mai multe constrângeri și puțin reasoning, fără coding și fără producție de tip carte sau eseu lung.
- **100 fișiere Markdown × 10 cazuri**.

## Răspunsurile de referință sunt aproximative

Pentru majoritatea cazurilor, răspunsul furnizat este **un exemplu plauzibil de răspuns bun**, nu singura formulare corectă. Sunt acceptabile variații de vocabular, ordine și stil dacă sensul este corect, cerința este respectată și nu sunt inventate informații.

Excepția o reprezintă cazurile marcate `Mod de evaluare: exact`: de exemplu `da`/`nu`, un singur cuvânt dintr-un set închis, un număr, o capitală sau o etichetă explicită. Pentru acestea se recomandă potrivire exactă după o normalizare rezonabilă a spațiilor, majusculelor și, unde este util, diacriticelor.

## Structura fiecărui caz

Fiecare exemplu are trei părți:

1. **Prompt** — inputul dat modelului.
2. **Răspuns de referință (obligatoriu în benchmark)** — răspunsul care ar trebui obținut semantic.
3. **Criterii indicative / opționale pentru evaluare** — dimensiune orientativă, elemente importante, variații acceptabile și tipul de corectare.

Criteriile sunt auxiliare. Ele pot fi folosite de un grader automat sau ignorate într-o evaluare manuală.

## Scorare recomandată

Pentru `exact`: 1 punct dacă răspunsul este corect, 0 altfel.

Pentru `semantic`, o rubrică simplă 0–2:
- **2** — corect, relevant, respectă instrucțiunea și nu inventează date;
- **1** — în mare corect, dar incomplet sau cu abatere minoră de format/lungime;
- **0** — greșit, ratează taskul, contrazice inputul sau inventează informații esențiale.

## Ce încearcă să măsoare

Benchmark-ul verifică lucruri apropiate de utilizarea cotidiană a unui chatbot: întrebări factuale, explicații de bază, reasoning ușor, calcule simple, transformare de text, traducere, clasificare, extracție, planificare, comparații și comunicare. Nu este un benchmark academic exhaustiv și nu ar trebui folosit singur pentru a concluziona că un model este „bun” în general.

## Lungime

Toate prompturile sunt proiectate să fie sub aproximativ o pagină. Chiar și cazurile lungi au răspunsuri de referință bine sub limita de 2–3 pagini. Pentru taskurile deschise, numărul de cuvinte este orientativ; nu penaliza automat un răspuns puțin mai scurt sau mai lung dacă este mai bun.

## Fișiere auxiliare

- `manifest.csv` și `manifest.jsonl`: indexul tuturor cazurilor;
- `dataset.jsonl`: toate cele 1.000 de prompturi, răspunsuri și criterii într-un format ușor de rulat programatic;
- `TAXONOMY.md`: familiile principale de taskuri;
- `VALIDATION.md`: verificările automate efectuate la generare.

## Recomandare de utilizare

Pentru dezvoltarea modelului, păstrează ideal o parte din fișiere ca test ascuns. Dacă folosești cazurile în prompt tuning sau în antrenare, nu mai raporta scorul pe aceleași exemple ca performanță de test.
