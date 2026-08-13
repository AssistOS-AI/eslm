# Benchmark LLM — Set 099

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-099-01`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ioana este mai înalt(ă) decât Daria, iar Daria este mai înalt(ă) decât Vlad. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Vlad

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Vlad.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-099-02`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Vlad Stan are 53 de ani și locuiește în Timișoara.” extrage numele complet și vârsta.

### Răspuns de referință (obligatoriu în benchmark)

Vlad Stan, 53 ani

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Vlad; Stan; 53.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 3 — `RO-099-03`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Vreau să țin minte să iau trei lucruri mâine dimineață. Ce ai face mai întâi?

### Răspuns de referință (obligatoriu în benchmark)

Scrie-le într-o listă scurtă și pune lista într-un loc vizibil sau setează un reminder.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 4 — `RO-099-04`

**Categorie:** `factual`  
**Domeniu:** `știință`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este o ipoteză?

### Răspuns de referință (obligatoriu în benchmark)

O explicație sau afirmație testabilă formulată pentru a fi verificată.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 5 — `RO-099-05`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Paul Georgescu are 23 de ani și locuiește în Sibiu.” extrage numele complet și vârsta.

### Răspuns de referință (obligatoriu în benchmark)

Paul Georgescu, 23 ani

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Paul; Georgescu; 23.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 6 — `RO-099-06`

**Categorie:** `task_complex_cotidian`  
**Domeniu:** `decizie și sinteză`  
**Clasă de lungime:** `long`  
**Dificultate:** `medium-hard`  
**Mod de evaluare:** `semantic`

### Prompt

Am trei variante pentru o zi de training cu 18 persoane. A: sală externă, 1.800 lei total, include proiector și cafea, dar nu prânz; deplasare 25 de minute pe sens. B: sala noastră, cost direct 0 lei, dar este confortabilă doar pentru 14 persoane și devine aglomerată cu scaune suplimentare. C: centru de training, 2.600 lei total, include sală, proiector, cafea și prânz; la 10 minute de birou.

Bugetul maxim este 3.000 lei. Scopul principal este ca oamenii să poată lucra confortabil în grupuri mici. Costul contează, dar nu este criteriul dominant. Nu vreau să organizez separat prea multe lucruri în ziua evenimentului.

Compară variantele după confort, logistică, cost și potrivire cu obiectivul. Recomandă una și o rezervă. Nu inventa prețul prânzului pentru A. Maximum 700 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

**A** se încadrează bine în buget și include echipamentul de bază, dar presupune aproape 50 de minute de deplasare dus-întors și lasă prânzul de organizat separat. Nu știm sigur cât de bine permite lucrul în grupuri mici.

**B** este cea mai ieftină și simplă logistic, dar are un defect direct legat de obiectiv: sala este confortabilă pentru 14 persoane, nu pentru 18. Aglomerarea ar reduce tocmai confortul considerat prioritar.

**C** costă 2.600 lei, deci rămâne sub buget. Include sala, proiectorul, cafeaua și prânzul și este la numai 10 minute de birou. Din datele furnizate, reduce cel mai mult logistica și evită problema clară de capacitate a lui B.

**Recomandare: C.** Costul este mai mare, dar se încadrează în limită, iar criteriul dominant este confortul și organizarea simplă.

**Rezervă: A.** Dacă C nu este disponibilă, A este mai potrivită decât B deoarece nu are o problemă explicită de capacitate și rămâne sub buget. Ar trebui însă clarificat aranjamentul pentru lucru în grupuri și organizarea prânzului. Nu putem estima costul prânzului fără date suplimentare.

Înainte de rezervare, o singură verificare suplimentară este critică: configurația reală a sălii C pentru lucru în grupuri mici. Datele spun că serviciile sunt incluse, dar nu descriu aranjamentul meselor. Dacă sala C nu permite gruparea participanților, recomandarea s-ar putea schimba. Același control trebuie făcut și pentru A dacă devine opțiunea de rezervă.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 226–850 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia; trebuie să respecte toate constrângerile, să folosească datele furnizate și să nu inventeze informații esențiale.

---

## Exemplul 7 — `RO-099-07`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Proiectul a întârziat două zile din cauza unei livrări, dar bugetul nu s-a schimbat.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

Întârziere de două zile fără impact asupra bugetului.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 8 — `RO-099-08`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Este o idee interesantă.”

### Răspuns de referință (obligatoriu în benchmark)

It is an interesting idea.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 9 — `RO-099-09`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Regatului Unit?

### Răspuns de referință (obligatoriu în benchmark)

Londra

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Londra.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-099-10`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „The file is too large.”

### Răspuns de referință (obligatoriu în benchmark)

Fișierul este prea mare.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.
