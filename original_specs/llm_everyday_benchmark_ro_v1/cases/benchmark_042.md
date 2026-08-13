# Benchmark LLM — Set 042

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-042-01`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Radu este mai înalt(ă) decât Paul, iar Paul este mai înalt(ă) decât Elena. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Elena

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Elena.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-042-02`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Nu mai întârzia.”

### Răspuns de referință (obligatoriu în benchmark)

Te rog să încerci să respecți termenul stabilit.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 3 — `RO-042-03`

**Categorie:** `procente`  
**Domeniu:** `matematică aplicată`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Un preț de 150 lei crește cu 25%. Care este noul preț?

### Răspuns de referință (obligatoriu în benchmark)

187.5 lei

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 187.5.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-042-04`

**Categorie:** `sumarizare_structurată`  
**Domeniu:** `muncă`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă notițele într-un rezumat de maximum 180 de cuvinte, separat în: stare, risc principal, decizie și pas următor. Nu inventa informații.

Proiectul Atlas este finalizat în proporție de aproximativ 74%. Testarea funcțională de bază a trecut, însă livrarea unui echipament întârzie cu 2 zile. Bugetul nu s-a modificat. Echipa a decis să continue lucrul care nu depinde de echipament. Un nou punct de verificare va avea loc marți la ora 11:00. Dacă echipamentul nu a sosit până atunci, managerul va decide dacă mută data demonstrației.

### Răspuns de referință (obligatoriu în benchmark)

**Stare.** Proiectul Atlas este finalizat în proporție de aproximativ 74%, iar testarea funcțională de bază a fost trecută. Bugetul rămâne neschimbat.

**Risc principal.** Livrarea echipamentului întârzie cu 2 zile și poate afecta data demonstrației.

**Decizie.** Echipa continuă activitățile care nu depind de echipament și nu modifică deocamdată planul general.

**Pas următor.** Va avea loc un nou punct de verificare marți la ora 11:00. Dacă echipamentul nu a sosit până atunci, managerul va decide dacă demonstrația trebuie reprogramată.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 78–180 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 74; 2 zile; marți; buget.
- **Variații acceptabile:** Formularea poate varia, dar trebuie păstrate cele patru secțiuni și faptele.

---

## Exemplul 5 — `RO-042-05`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Clientul a aprobat designul, dar cere o ultimă verificare a textelor.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Design aprobat, cu o verificare finală a textelor.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 6 — `RO-042-06`

**Categorie:** `da_nu`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Numărul 53 este par? Răspunde doar cu „da” sau „nu”.

### Răspuns de referință (obligatoriu în benchmark)

nu

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** nu.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-042-07`

**Categorie:** `procente`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât reprezintă 5% din 40?

### Răspuns de referință (obligatoriu în benchmark)

2

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 2.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-042-08`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 86 + 44?

### Răspuns de referință (obligatoriu în benchmark)

130

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 130.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-042-09`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Echipa a terminat testele, iar lansarea rămâne programată pentru vineri.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

Testele sunt finalizate; lansarea rămâne vineri.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 10 — `RO-042-10`

**Categorie:** `factual`  
**Domeniu:** `economie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este moneda Regatului Unit?

### Răspuns de referință (obligatoriu în benchmark)

Lira sterlină

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–10 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Lira sterlină.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
