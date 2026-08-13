# Benchmark LLM — Set 094

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-094-01`

**Categorie:** `vocabular`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Dă un antonim potrivit pentru „activ”.

### Răspuns de referință (obligatoriu în benchmark)

inactiv

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice antonim corect în context general.

---

## Exemplul 2 — `RO-094-02`

**Categorie:** `da_nu`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Numărul 18 este par? Răspunde doar cu „da” sau „nu”. Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

da

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** da.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-094-03`

**Categorie:** `comunicare_profesională`  
**Domeniu:** `muncă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Vrei să ceri clarificarea unui termen-limită.

### Răspuns de referință (obligatoriu în benchmark)

Poți confirma, te rog, data și ora exactă a termenului-limită?

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 3–30 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări naturale, politicoase și funcțional echivalente.

---

## Exemplul 4 — `RO-094-04`

**Categorie:** `task_complex_cotidian`  
**Domeniu:** `decizie și sinteză`  
**Clasă de lungime:** `long`  
**Dificultate:** `medium-hard`  
**Mod de evaluare:** `semantic`

### Prompt

O echipă de customer support a primit într-o săptămână următoarele observații: 14 clienți spun că răspunsurile sunt rapide, 9 că explicațiile sunt clare, 6 reclamă că repetă aceeași informație după transferul între agenți, 5 spun că răspunsul inițial a fost prea generic, 4 reclamă timpul mare de așteptare seara, 3 apreciază tonul prietenos, iar 2 spun că au primit informații contradictorii de la doi agenți.

Grupează observațiile în teme, separă punctele forte de probleme, prioritizează maximum trei îmbunătățiri și justifică ordinea numai din datele furnizate. La final, propune trei întrebări suplimentare pentru manager. Maximum 750 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Feedbackul se poate grupa în patru teme: viteză, claritate și specificitate, continuitatea între agenți și consistența informației.

**Puncte forte.** Cel mai frecvent feedback pozitiv este viteza, cu 14 mențiuni. Claritatea are 9 mențiuni, iar tonul prietenos 3.

**Probleme.** Repetarea informației după transfer apare în 6 comentarii. Răspunsurile prea generice apar în 5, iar așteptarea mare seara în 4. Informațiile contradictorii apar în 2 cazuri, dar pot avea un impact mai mare decât frecvența lor.

**Prioritatea 1: continuitatea la transfer**, deoarece este problema cu cele mai multe mențiuni. Ar trebui verificat dacă agentul care preia cazul vede istoricul și informațiile deja furnizate.

**Prioritatea 2: specificitatea primului răspuns.** Cele 5 mențiuni sugerează că viteza nu este suficientă dacă răspunsul nu folosește contextul cazului.

**Prioritatea 3: acoperirea de seară și consistența.** Așteptarea de seară are 4 mențiuni; cele două cazuri contradictorii merită totuși investigație separată din cauza riscului de corectitudine.

Întrebări suplimentare: în ce tipuri de cazuri apar transferurile problematice? Cât diferă timpul de răspuns seara? Ce subiecte au produs informațiile contradictorii?

Prioritizarea după numărul de mențiuni este doar un punct de pornire. O problemă rară, precum informația contradictorie, poate avea efect mai grav decât una frecventă, dar minoră. De aceea managerul ar trebui să urmărească separat frecvența și severitatea. Un ciclu simplu este: identifică tema, verifică exemplele concrete, aplică o schimbare mică și măsoară dacă numărul de reclamații din aceeași categorie scade.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 230–850 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia; trebuie să respecte toate constrângerile, să folosească datele furnizate și să nu inventeze informații esențiale.

---

## Exemplul 5 — `RO-094-05`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 99 ÷ 9?

### Răspuns de referință (obligatoriu în benchmark)

11

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 11.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-094-06`

**Categorie:** `corectare_text`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Corectează majusculele și punctuația: „ai terminat raportul”

### Răspuns de referință (obligatoriu în benchmark)

Ai terminat raportul?

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă variante de punctuație corecte și naturale.

---

## Exemplul 7 — `RO-094-07`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Câți metri sunt în 14 kilometri?

### Răspuns de referință (obligatoriu în benchmark)

14000 metri

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 14000.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-094-08`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Trebuie să plec acum.”

### Răspuns de referință (obligatoriu în benchmark)

I have to leave now.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 9 — `RO-094-09`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este un obiectiv măsurabil.

### Răspuns de referință (obligatoriu în benchmark)

Este un obiectiv formulat astfel încât atingerea lui să poată fi verificată prin criterii observabile.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 10 — `RO-094-10`

**Categorie:** `procente`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât reprezintă 20% din 100?

### Răspuns de referință (obligatoriu în benchmark)

20

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 20.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
