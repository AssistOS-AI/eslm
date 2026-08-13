# Benchmark LLM — Set 084

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-084-01`

**Categorie:** `creativ_scurt`  
**Domeniu:** `creativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Propune un titlu pentru un jurnal de călătorie.

### Răspuns de referință (obligatoriu în benchmark)

Drumuri și Amintiri

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia liber dacă respectă tema și limita.

---

## Exemplul 2 — `RO-084-02`

**Categorie:** `critică_argument`  
**Domeniu:** `logică`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Analizează argumentul: „Două persoane au reușit cu metoda, deci metoda funcționează pentru toată lumea.”

În maximum 180 de cuvinte: spune problema logică principală, explică de ce concluzia nu rezultă suficient din premisă și propune ce informație suplimentară ar face argumentul mai solid.

### Răspuns de referință (obligatoriu în benchmark)

Problema principală este că **două exemple nu justifică o generalizare universală**. Premisa poate fi relevantă, dar nu este suficientă pentru concluzia generală formulată.

Pentru ca argumentul să fie mai solid, ar trebui adăugate dovezi care leagă direct premisa de concluzie: mai multe observații reprezentative, comparații relevante, teste sau informații despre mecanismul cauzal, după caz. Concluzia ar trebui formulată proporțional cu forța dovezilor, nu extinsă dincolo de ele.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 67–180 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Nu este obligatorie eticheta formală a erorii; este obligatorie identificarea relației logice defectuoase.

---

## Exemplul 3 — `RO-084-03`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Spune-mi ce s-a întâmplat.”

### Răspuns de referință (obligatoriu în benchmark)

Te rog să îmi explici pe scurt ce s-a întâmplat.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 4 — `RO-084-04`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Te rog verifică adresa.”

### Răspuns de referință (obligatoriu în benchmark)

Please check the address.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 5 — `RO-084-05`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Bugetul a rămas constant, însă termenul de livrare a fost prelungit cu o săptămână.”

### Răspuns de referință (obligatoriu în benchmark)

Buget neschimbat; termen prelungit cu o săptămână.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 6 — `RO-084-06`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Copiii se joacă în parc.”

### Răspuns de referință (obligatoriu în benchmark)

The children are playing in the park.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 7 — `RO-084-07`

**Categorie:** `clasificare_simplă`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică „crocodil”: mamifer, pasăre, reptilă, amfibian sau pește. Răspunde cu un singur cuvânt.

### Răspuns de referință (obligatoriu în benchmark)

reptilă

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** reptilă.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-084-08`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Nu ai completat tabelul.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

Am observat că tabelul nu este încă complet; te rog să îl finalizezi.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 9 — `RO-084-09`

**Categorie:** `factual`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ce organ pompează sângele în corp?

### Răspuns de referință (obligatoriu în benchmark)

Inima

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Inima.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-084-10`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Paul este mai înalt(ă) decât Vlad, iar Vlad este mai înalt(ă) decât Daria. Cine este cel mai scund? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Daria

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Daria.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
