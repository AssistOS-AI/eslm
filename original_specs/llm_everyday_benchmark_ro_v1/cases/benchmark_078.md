# Benchmark LLM — Set 078

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-078-01`

**Categorie:** `plan_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Vreau să organizez o mică întâlnire acasă pentru 8 persoane. Bugetul maxim este 750 lei. Nu vreau un meniu sofisticat. Am două ore pentru pregătire și vreau ca în ultima jumătate de oră să nu mai gătesc, ci doar să aranjez masa și să mă pregătesc.

Propune un plan practic pe etape. Nu da prețuri exacte pentru produse, fiindcă nu ți-am furnizat prețuri locale. Maximum 220 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Aș împărți cele două ore astfel:

**Primele 20 de minute:** verifică ce ai deja, stabilește un meniu simplu și fă lista finală. Ține bugetul total sub 750 lei, dar nu inventa prețuri.

**Următoarele 70 de minute:** pregătește lucruri care pot sta gata până sosesc invitații: un aperitiv simplu, un fel principal ușor și băuturile. În paralel, strânge bucătăria.

**Ultimele 30 de minute:** oprește gătitul. Aranjează masa, pune paharele și tacâmurile, verifică zona de intrare și lasă câteva minute pentru tine.

Planul respectă cerința principală: ultimele 30 de minute rămân fără gătit și fără sarcini complicate.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 95–230 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 750; 30 de minute; 8 persoane; două ore.
- **Variații acceptabile:** Meniul poate varia; trebuie păstrată constrângerea de timp și evitarea prețurilor inventate.

---

## Exemplul 2 — `RO-078-02`

**Categorie:** `factual`  
**Domeniu:** `chimie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este o moleculă?

### Răspuns de referință (obligatoriu în benchmark)

Un ansamblu de doi sau mai mulți atomi legați chimic.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 3 — `RO-078-03`

**Categorie:** `procente`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât reprezintă 5% din 300?

### Răspuns de referință (obligatoriu în benchmark)

15

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 15.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-078-04`

**Categorie:** `factual`  
**Domeniu:** `fizică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La ce temperatură îngheață apa pură la presiune atmosferică standard?

### Răspuns de referință (obligatoriu în benchmark)

0 °C

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–10 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 0 °C.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-078-05`

**Categorie:** `clasificare_sentiment`  
**Domeniu:** `clasificare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică tonul ca pozitiv, negativ sau neutru. Răspunde cu un singur cuvânt: „Pachetul a fost livrat ieri.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

neutru

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** neutru.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-078-06`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Maria este mai înalt(ă) decât Ioana, iar Ioana este mai înalt(ă) decât Andrei. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Andrei

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Andrei.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-078-07`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 14, 18, 22, 26, ...

### Răspuns de referință (obligatoriu în benchmark)

30

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 30.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-078-08`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 10 × 4?

### Răspuns de referință (obligatoriu în benchmark)

40

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 40.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-078-09`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 9, 12, 15, 18, ...

### Răspuns de referință (obligatoriu în benchmark)

21

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 21.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-078-10`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Apa este rece.”

### Răspuns de referință (obligatoriu în benchmark)

The water is cold.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.
