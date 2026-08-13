# Benchmark LLM — Set 077

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-077-01`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La o masă sunt 8 persoane și fiecare primește câte 4 pahare cu apă. Câte pahare sunt necesare? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

32

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 32.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-077-02`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Ioana Munteanu are 31 de ani și locuiește în Oradea.” extrage doar orașul.

### Răspuns de referință (obligatoriu în benchmark)

Oradea

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Oradea.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 3 — `RO-077-03`

**Categorie:** `critică_argument`  
**Domeniu:** `logică`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Analizează argumentul: „Dacă reducem o întâlnire, în curând nu vom mai avea deloc întâlniri.”

În maximum 180 de cuvinte: spune problema logică principală, explică de ce concluzia nu rezultă suficient din premisă și propune ce informație suplimentară ar face argumentul mai solid.

### Răspuns de referință (obligatoriu în benchmark)

Problema principală este că **concluzia escaladează fără o legătură justificată între pași**. Premisa poate fi relevantă, dar nu este suficientă pentru concluzia generală formulată.

Pentru ca argumentul să fie mai solid, ar trebui adăugate dovezi care leagă direct premisa de concluzie: mai multe observații reprezentative, comparații relevante, teste sau informații despre mecanismul cauzal, după caz. Concluzia ar trebui formulată proporțional cu forța dovezilor, nu extinsă dincolo de ele.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 68–180 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Nu este obligatorie eticheta formală a erorii; este obligatorie identificarea relației logice defectuoase.

---

## Exemplul 4 — `RO-077-04`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Biroul meu este foarte dezordonat. Răspunde concis.

### Răspuns de referință (obligatoriu în benchmark)

Elimină gunoiul, grupează documentele și păstrează pe birou doar lucrurile folosite zilnic.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 5 — `RO-077-05`

**Categorie:** `procente`  
**Domeniu:** `matematică aplicată`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Un preț de 120 lei crește cu 10%. Care este noul preț?

### Răspuns de referință (obligatoriu în benchmark)

132 lei

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 132.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-077-06`

**Categorie:** `generare_titlu`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă propoziția într-un titlu de maximum 8 cuvinte: „Echipa a încheiat testarea și pregătește lansarea de vineri.”

### Răspuns de referință (obligatoriu în benchmark)

Testare finalizată înainte de lansare

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice titlu fidel, clar și de maximum 8 cuvinte.

---

## Exemplul 7 — `RO-077-07`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este cauzalitatea.

### Răspuns de referință (obligatoriu în benchmark)

Este relația în care o schimbare produce sau contribuie la producerea alteia.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 8 — `RO-077-08`

**Categorie:** `creativ_scurt`  
**Domeniu:** `creativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Scrie un slogan pentru o bibliotecă de cartier.

### Răspuns de referință (obligatoriu în benchmark)

Mai aproape de cărți, mai aproape de idei.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia liber dacă respectă tema și limita.

---

## Exemplul 9 — `RO-077-09`

**Categorie:** `procente`  
**Domeniu:** `matematică aplicată`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Un preț de 500 lei crește cu 25%. Care este noul preț?

### Răspuns de referință (obligatoriu în benchmark)

625 lei

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 625.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-077-10`

**Categorie:** `procente`  
**Domeniu:** `matematică aplicată`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Un preț de 240 lei crește cu 5%. Care este noul preț?

### Răspuns de referință (obligatoriu în benchmark)

252 lei

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 252.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
