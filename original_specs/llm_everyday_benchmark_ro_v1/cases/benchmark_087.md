# Benchmark LLM — Set 087

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-087-01`

**Categorie:** `plan_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Vreau să organizez o mică întâlnire acasă pentru 8 persoane. Bugetul maxim este 850 lei. Nu vreau un meniu sofisticat. Am două ore pentru pregătire și vreau ca în ultima jumătate de oră să nu mai gătesc, ci doar să aranjez masa și să mă pregătesc.

Propune un plan practic pe etape. Nu da prețuri exacte pentru produse, fiindcă nu ți-am furnizat prețuri locale. Maximum 220 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Aș împărți cele două ore astfel:

**Primele 20 de minute:** verifică ce ai deja, stabilește un meniu simplu și fă lista finală. Ține bugetul total sub 850 lei, dar nu inventa prețuri.

**Următoarele 70 de minute:** pregătește lucruri care pot sta gata până sosesc invitații: un aperitiv simplu, un fel principal ușor și băuturile. În paralel, strânge bucătăria.

**Ultimele 30 de minute:** oprește gătitul. Aranjează masa, pune paharele și tacâmurile, verifică zona de intrare și lasă câteva minute pentru tine.

Planul respectă cerința principală: ultimele 30 de minute rămân fără gătit și fără sarcini complicate.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 95–230 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 850; 30 de minute; 8 persoane; două ore.
- **Variații acceptabile:** Meniul poate varia; trebuie păstrată constrângerea de timp și evitarea prețurilor inventate.

---

## Exemplul 2 — `RO-087-02`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Biroul meu este foarte dezordonat. Dă maximum trei pași.

### Răspuns de referință (obligatoriu în benchmark)

Elimină gunoiul, grupează documentele și păstrează pe birou doar lucrurile folosite zilnic.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 3 — `RO-087-03`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 52 + 32?

### Răspuns de referință (obligatoriu în benchmark)

84

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 84.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-087-04`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „We agree with the proposal.”

### Răspuns de referință (obligatoriu în benchmark)

Suntem de acord cu propunerea.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 5 — `RO-087-05`

**Categorie:** `factual`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce rol au globulele roșii?

### Răspuns de referință (obligatoriu în benchmark)

Transportă în principal oxigenul prin sânge.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–14 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 6 — `RO-087-06`

**Categorie:** `clasificare_sentiment`  
**Domeniu:** `clasificare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică tonul ca pozitiv, negativ sau neutru. Răspunde cu un singur cuvânt: „Serviciul a fost excelent și foarte rapid.”

### Răspuns de referință (obligatoriu în benchmark)

pozitiv

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** pozitiv.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-087-07`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este autorizarea.

### Răspuns de referință (obligatoriu în benchmark)

Este procesul de stabilire a acțiunilor și resurselor la care o identitate are acces.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 8 — `RO-087-08`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este inerția.

### Răspuns de referință (obligatoriu în benchmark)

Inerția este tendința unui corp de a-și păstra starea de repaus sau de mișcare uniformă dacă nu acționează o forță netă.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 9 — `RO-087-09`

**Categorie:** `factual`  
**Domeniu:** `tehnologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ce înseamnă URL?

### Răspuns de referință (obligatoriu în benchmark)

Uniform Resource Locator

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–11 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Uniform Resource Locator.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-087-10`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este un deadline.

### Răspuns de referință (obligatoriu în benchmark)

Este termenul limită până la care o sarcină trebuie finalizată.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.
