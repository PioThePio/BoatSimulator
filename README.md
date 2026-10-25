# Przystań — symulator manewrów na Zegrzu

**[Uruchom w przeglądarce](https://piothepio.github.io/BoatSimulator/?v=27.1.0)** · komputer, telefon lub tablet, bez konta i instalowania gry.

Symulator z widokiem z góry do ćwiczenia manewrów, cumowania, kotwiczenia,
holowania i wodowania z przyczepy. Ma dziewięć profili łodzi, pięć rodzajów
napędu, niezależne silniki, instalację elektryczną, paliwo, uszkodzenia,
zęzę i pompę. Wiatr, prąd, fale, kilwater, cumy i odbijacze fizycznie
oddziałują na jednostki. SUV z przyczepą pozwala przećwiczyć slipowanie.

Można tworzyć flotę do ośmiu jednostek, w tym barkę, banan, materac,
wiosłówkę i kajak, oraz rzucać koło ratunkowe i treningowy manekin MOB.
Tor treningowy ma znaki IALA A i fizyczne podwodne przeszkody.
Wyścigowa ma dwa turbodoładowane diesle do 600 KM każdy. Logbook zbiera
łączne statystyki i incydenty. Lokalny automatyczny zapis umożliwia kontynuowanie próby po powrocie.

Mapa jest interpretacją Jeziora Zegrzyńskiego w skali odległości 50%,
z portami, mostami, ujściami rzek i wyspami. Euzebia oraz treningowy układ
Pilawy z oznaczonym stanowiskiem ORLEN są opisane wraz z ograniczeniami
dokładności w dokumentacji. Geografia i głębokości nie są mapą nawigacyjną;
model fizyczny nie jest skalibrowany dla konkretnej rzeczywistej łodzi.

## Dokumentacja do przekazania dalej

- **[Instrukcja użytkownika](docs/INSTRUKCJA.md)** — obsługa od pierwszego
  uruchomienia, wszystkie stanowiska i mechaniki, skróty, ćwiczenia,
  zapis i rozwiązywanie problemów.
- **[Model, możliwości i zakres odwzorowania](docs/MODEL.md)** — co rzeczywiście
  działa, jak jest liczone, przyjęte parametry, uproszczenia, źródła,
  architektura, wydajność i testy.

Oba dokumenty opisują aktualny stan, bez dziennika kolejnych wydań.
Historię zmian przechowuje Git.

## Uruchomienie projektu

Node.js ≥20.19, npm oraz Chromium do testów przeglądarkowych.

```sh
npm ci
npm run dev
```

Adres serwera pokazuje Vite. Do własnego hostingu statycznego:

```sh
npm run build
```

Wynikiem jest `dist/index.html` z osadzonym kodem i stylami. Projekt nie
pobiera kafelków mapy ani dźwięków podczas pływania. GitHub Pages publikuje
z gałęzi `main` po przejściu automatycznych kontroli.

## Sprawdzenie projektu

```sh
npm test
npm run test:e2e -- --workers=2
npm run test:production
npm run audit:physics
npm run benchmark
```

Testy e2e domyślnie korzystają z `/usr/bin/chromium`; inną lokalizację można
ustawić zmienną `CHROMIUM_PATH`. Szczegóły pomiarów i zakres testów opisuje
[Model](docs/MODEL.md#testy-i-wydajność).
