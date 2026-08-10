# StoryCircuit-TinyStories

## Kit de cercetare pentru un model lingvistic simbolic executabil

Acest proiect propune și pregătește un experiment mai ambițios decât pilotul cu vocabular restrâns. Ținta nu este un parser pentru câteva forme artificiale, ci un sistem care încearcă să reproducă, pe cât posibil, clasele de capabilități demonstrate de modelele antrenate pe TinyStories:

- estimarea probabilității textului și predicția următorului token;
- continuarea unui prompt și generarea unei povești complete;
- gramatică și realizare lingvistică;
- menținerea personajelor, obiectelor, locurilor și stărilor;
- coreferență, temporalitate, cauzalitate, scopuri, emoții și dialog;
- întrebări despre poveste, explicații și detectarea contradicțiilor;
- generalizare la lanțuri mai lungi, distractori și combinații noi.

Modelul este numit **Executable Symbolic Language Model — ESLM**. El nu are un vocabular limitat la 100 de tokenuri. Lexiconul, construcțiile și regulile sunt învățate incremental din întregul corpus. Sistemul expune aceeași interfață externă ca un model cauzal, astfel încât aceeași suită să poată evalua atât ESLM, cât și modelele oficiale TinyStories de 1M, 3M, 8M și 33M de parametri.

## Ipoteza centrală

Un model lingvistic nu trebuie tratat obligatoriu ca o singură funcție neuronală opacă. Pentru domeniul controlat TinyStories, distribuția textului poate fi aproximată prin compoziția explicită a mai multor modele executabile:

```text
text
  -> construcții lexicale și gramaticale
  -> referințe și entități persistente
  -> evenimente și modificări ale stării lumii
  -> relații temporale, cauzale și sociale
  -> scheme narative și planuri
  -> realizare lingvistică ponderată
```

Modelul complet combină probabilități normalizate provenite dintr-un model lexical de acoperire totală, o gramatică ponderată, un model de discurs, un model al lumii și un model narativ. Componentele simbolice pot fi induse prin numărare, anti-unificare, mining de secvențe, inducție de reguli, optimizare Minimum Description Length și un ciclu de sinteză de programe ghidat de contraexemple. Coding agents pot propune noi circuite, dar acestea intră în model numai după teste pe splituri izolate și verificări de regresie.


## Ce a fost rulat efectiv în această arhivă

Pe lângă smoke test, pachetul conține un pilot executat pe primele 5.000 de povești din fișierul oficial legacy de validare, împărțite prin hash în 3.956 train și 1.044 held-out. Modelul byte 4-gram a obținut aproximativ **1,912 bits/byte** pe întregul held-out, dar numai **51,6%** la selectarea unui final corect față de un final din altă poveste; scorul semantic diagnostic a obținut 51,4%. O grilă de scalare a redus BPB până la aproximativ 1,882, în timp ce ending selection a rămas în jurul șansei. Acestea sunt rezultate negative utile și împiedică prezentarea kernelului drept o soluție deja validată.

Pe suita controlată de 1.600 de itemi, runtime-ul rezolvă aproape perfect transferurile de posesie, dar obține numai 20% pe reguli condiționale, care nu sunt încă implementate. Scorurile controlate trebuie citite împreună cu `reports/CONTROLLED_SUITE_FINDINGS.md`; ele nu substituie evaluarea pe limbaj natural.

A fost rulat și un smoke test al baseline-ului Transformer byte-level pur PyTorch. Checkpointul de 18.912 parametri și cinci pași validează numai pipeline-ul neural, nu performanța.

## Ce conține arhiva

```text
theory/             teoria și programul științific
design_specs/       20 de specificații de design independente
architecture/       contracte, diagrame și decizii arhitecturale
schemas/            scheme JSON pentru StoryIR, reguli, construcții și evaluări
src/storycircuit/    kernel executabil de referință
scripts/             descărcare, pregătire, antrenare, evaluare și raportare
eval/                taxonomia și adaptoarele suitei de evaluare
agents/              instrucțiuni și prompturi pentru coding agents
configs/             profiluri smoke, pilot, workstation și full
tests/               teste unitare și de integrare
data/smoke/          date sintetice mici, fără corpusul TinyStories
results/smoke/       rezultate produse de rularea de verificare
```

Corpusul TinyStories nu este redistribuit. Scripturile îl descarcă din depozitul oficial și păstrează hashurile și proveniența.

## Pornire rapidă

Necesită Python 3.11 sau mai nou.

```bash
cd storycircuit_tinystories
python -m venv .venv
source .venv/bin/activate          # Linux/macOS
# .venv\Scripts\activate         # Windows PowerShell
pip install -e ".[dev]"
python scripts/check_environment.py
python scripts/run_smoke.py
pytest -q
```

Pentru un prim experiment pe un eșantion TinyStories:

```bash
python scripts/download_tinystories.py --variant v2-gpt4
python scripts/prepare_corpus.py --profile configs/profiles/pilot.yaml
python scripts/train_symbolic.py --profile configs/profiles/pilot.yaml
python scripts/evaluate.py \
  --model artifacts/pilot/model.json \
  --suite configs/suites/core.yaml
```

Pentru comparație cu TinyStories-1M:

```bash
pip install -e ".[neural]"
python scripts/evaluate_hf_baseline.py \
  --model roneneldan/TinyStories-1M \
  --suite configs/suites/core.yaml
python scripts/compare_runs.py results/symbolic.json results/tinystories_1m.json
```

## Ordinea recomandată pentru un coding agent

Agentul principal trebuie să citească, în această ordine:

1. `PROJECT_CHARTER.md`;
2. `theory/00_RESEARCH_PROGRAM.md`;
3. `theory/02_TASK_AND_CAPABILITY_TAXONOMY.md`;
4. `architecture/SYSTEM_OVERVIEW.md`;
5. `design_specs/DS-001-RESEARCH-CONTRACT.md`;
6. specificația workstreamului alocat;
7. `agents/AGENT_OPERATING_MANUAL.md`.

Nu este permisă schimbarea structurii StoryIR, a protocolului LM sau a spliturilor de evaluare fără un Architecture Decision Record.

## Ce înseamnă „simbolic” aici

Nucleul de execuție, memoria narativă, regulile de stare, planificarea, verificarea și trasarea sunt reprezentări și algoritmi expliciți. Sunt permise trei regimuri experimentale, raportate separat:

- **S0 — pure symbolic:** numai algoritmi, numărări, gramatici și reguli;
- **S1 — symbolic plus learned router:** un model mic poate selecta o construcție sau completa sloturi, dar nu execută raționamentul;
- **S2 — teacher-assisted induction:** un LLM poate produce adnotări de antrenare sau propuneri de reguli offline, însă nu este folosit la inferență și consumul său este contabilizat.

Rezultatele acestor regimuri nu trebuie amestecate.

## Criteriul de succes

Nu este necesar ca ESLM să depășească TinyStories-1M pe toate dimensiunile. Un rezultat științific valoros poate fi obținut dacă sistemul demonstrează una dintre următoarele proprietăți, cu cost comparabil:

- generalizare sistematică mai bună la adâncime, distractori sau compoziții noi;
- consistență narativă și entity tracking mai bune;
- explicații și contraexemple verificabile;
- eficiență de date, dimensiune sau energie;
- localizarea clară a erorilor între analiză, execuție și realizare;
- identificarea precisă a frontierelor unde reprezentarea simbolică nu mai este competitivă.

Documentul `theory/06_EVALUATION_AND_FALSIFICATION.md` definește criteriile de falsificare și regulile pentru a evita o comparație favorabilă artificial sistemului simbolic.
