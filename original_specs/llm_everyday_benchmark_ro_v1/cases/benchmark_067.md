# Benchmark LLM — Set 067

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-067-01`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt de ce avem anotimpuri.

### Răspuns de referință (obligatoriu în benchmark)

Anotimpurile apar în principal din cauza înclinării axei Pământului în raport cu planul orbitei sale.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 2 — `RO-067-02`

**Categorie:** `clasificare_sentiment`  
**Domeniu:** `clasificare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică tonul ca pozitiv, negativ sau neutru. Răspunde cu un singur cuvânt: „Mi-a plăcut foarte mult experiența.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

pozitiv

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** pozitiv.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-067-03`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Am o oră liberă și trei sarcini mici. Dă maximum trei pași.

### Răspuns de referință (obligatoriu în benchmark)

Estimează durata, începe cu cea mai importantă și lasă câteva minute pentru verificare.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 4 — `RO-067-04`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este media numerelor 18, 10 și 13?

### Răspuns de referință (obligatoriu în benchmark)

13.67

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 13.67.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-067-05`

**Categorie:** `critică_argument`  
**Domeniu:** `logică`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Analizează argumentul: „Dacă o regulă are o excepție, regula nu este deloc utilă.”

În maximum 180 de cuvinte: spune problema logică principală, explică de ce concluzia nu rezultă suficient din premisă și propune ce informație suplimentară ar face argumentul mai solid.

### Răspuns de referință (obligatoriu în benchmark)

Problema principală este că **o excepție nu anulează automat utilitatea unei reguli generale**. Premisa poate fi relevantă, dar nu este suficientă pentru concluzia generală formulată.

Pentru ca argumentul să fie mai solid, ar trebui adăugate dovezi care leagă direct premisa de concluzie: mai multe observații reprezentative, comparații relevante, teste sau informații despre mecanismul cauzal, după caz. Concluzia ar trebui formulată proporțional cu forța dovezilor, nu extinsă dincolo de ele.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 69–180 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Nu este obligatorie eticheta formală a erorii; este obligatorie identificarea relației logice defectuoase.

---

## Exemplul 6 — `RO-067-06`

**Categorie:** `comunicare_profesională`  
**Domeniu:** `muncă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Trebuie să refuzi o întâlnire fără explicații lungi.

### Răspuns de referință (obligatoriu în benchmark)

Mulțumesc pentru invitație. Din păcate, nu pot participa de data aceasta.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 3–30 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări naturale, politicoase și funcțional echivalente.

---

## Exemplul 7 — `RO-067-07`

**Categorie:** `factual`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cum se numește unitatea de bază a vieții?

### Răspuns de referință (obligatoriu în benchmark)

Celula

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Celula.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-067-08`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 73 + 32?

### Răspuns de referință (obligatoriu în benchmark)

105

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 105.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-067-09`

**Categorie:** `factual`  
**Domeniu:** `istorie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

În ce an a început Revoluția Franceză?

### Răspuns de referință (obligatoriu în benchmark)

1789

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 1789.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-067-10`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Radu Ilie are 57 de ani și locuiește în Cluj-Napoca.” extrage numele complet și vârsta.

### Răspuns de referință (obligatoriu în benchmark)

Radu Ilie, 57 ani

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Radu; Ilie; 57.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.
