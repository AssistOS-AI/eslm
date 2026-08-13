# Benchmark LLM — Set 051

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-051-01`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Ana Popescu are 35 de ani și locuiește în Iași.” extrage doar orașul.

### Răspuns de referință (obligatoriu în benchmark)

Iași

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Iași.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 2 — `RO-051-02`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „Where is the nearest station?”

### Răspuns de referință (obligatoriu în benchmark)

Unde este cea mai apropiată stație?

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 3 — `RO-051-03`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Vreau să pregătesc bagajul pentru un weekend. Ce ai face mai întâi?

### Răspuns de referință (obligatoriu în benchmark)

Fă o listă pe categorii: haine, igienă, documente, încărcătoare și obiecte specifice activităților.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 4 — `RO-051-04`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Ungariei?

### Răspuns de referință (obligatoriu în benchmark)

Budapesta

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Budapesta.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-051-05`

**Categorie:** `da_nu`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Numărul 77 este par? Răspunde doar cu „da” sau „nu”. Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

nu

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** nu.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-051-06`

**Categorie:** `plan_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Vreau să organizez o mică întâlnire acasă pentru 8 persoane. Bugetul maxim este 650 lei. Nu vreau un meniu sofisticat. Am două ore pentru pregătire și vreau ca în ultima jumătate de oră să nu mai gătesc, ci doar să aranjez masa și să mă pregătesc.

Propune un plan practic pe etape. Nu da prețuri exacte pentru produse, fiindcă nu ți-am furnizat prețuri locale. Maximum 220 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Aș împărți cele două ore astfel:

**Primele 20 de minute:** verifică ce ai deja, stabilește un meniu simplu și fă lista finală. Ține bugetul total sub 650 lei, dar nu inventa prețuri.

**Următoarele 70 de minute:** pregătește lucruri care pot sta gata până sosesc invitații: un aperitiv simplu, un fel principal ușor și băuturile. În paralel, strânge bucătăria.

**Ultimele 30 de minute:** oprește gătitul. Aranjează masa, pune paharele și tacâmurile, verifică zona de intrare și lasă câteva minute pentru tine.

Planul respectă cerința principală: ultimele 30 de minute rămân fără gătit și fără sarcini complicate.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 95–230 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 650; 30 de minute; 8 persoane; două ore.
- **Variații acceptabile:** Meniul poate varia; trebuie păstrată constrângerea de timp și evitarea prețurilor inventate.

---

## Exemplul 7 — `RO-051-07`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 1, 5, 9, 13, ...

### Răspuns de referință (obligatoriu în benchmark)

17

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 17.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-051-08`

**Categorie:** `factual`  
**Domeniu:** `fizică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cum se numește schimbarea directă din solid în gaz?

### Răspuns de referință (obligatoriu în benchmark)

Sublimare

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Sublimare.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-051-09`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 8, 13, 18, 23, ...

### Răspuns de referință (obligatoriu în benchmark)

28

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 28.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-051-10`

**Categorie:** `factual`  
**Domeniu:** `astronomie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ce galaxie conține Sistemul Solar?

### Răspuns de referință (obligatoriu în benchmark)

Calea Lactee

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–10 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Calea Lactee.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
