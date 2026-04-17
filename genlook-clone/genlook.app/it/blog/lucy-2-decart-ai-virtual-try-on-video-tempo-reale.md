---
title: 'Lucy 2.0 di Decart AI: La Rivoluzione del Virtual Try-On Video in Tempo Reale'
metaShorterTitle: 'Lucy 2.0: Virtual Try-On in tempo reale'
description: Decart AI ha appena lanciato Lucy 2.0, un modello di trasformazione in
  tempo reale che permette cambi d'abito live in video. Ecco cosa significa per l'e-commerce
  di moda.
date: '2026-01-28'
author: Thibault Mathian
category: Novità del settore
image: /blog-images/lucy-2-realtime-try-on.jpg
translationOf: decart-ai-lucy-2-realtime-virtual-try-on
faq:
- question: Cos'è Lucy 2.0 di Decart AI?
  answer: Rilasciato il 26 gennaio 2026, Lucy 2.0 è un modello all'avanguardia per
    la trasformazione del mondo in tempo reale. Usa l'IA generativa per trasformare
    i feed video live all'istante, permettendo lo scambio di personaggi, cambi d'abito
    e alterazioni ambientali fino a 30 fps con latenza quasi nulla.
- question: In cosa differisce Lucy 2.0 dagli attuali strumenti di Virtual Try-On?
  answer: La maggior parte degli attuali strumenti VTO (come Genlook) genera risultati
    ad alta fedeltà su **immagini statiche**. Lucy 2.0 funziona su **flussi video
    live**, permettendo agli utenti di girarsi, camminare e muoversi mentre l'IA 'modella'
    i vestiti su di loro in tempo reale, senza usare mesh 3D.
- question: Lucy 2.0 è già disponibile per i negozi Shopify?
  answer: Non direttamente. Sebbene l'API sia live, il costo di calcolo per l'editing
    video in tempo reale è attualmente di circa **0,05 $ al secondo**, rendendolo
    proibitivo per le sessioni standard di e-commerce (9,00 $ per utente).
- question: Quando diventerà accessibile il try-on video in tempo reale?
  answer: Prevediamo che nel giro di 6-12 mesi, tecniche di ottimizzazione come la
    distillazione dei modelli e chip di inferenza dedicati (come Sohu di Etched) faranno
    scendere i costi a una soglia sostenibile di circa **0,20 $ a sessione**.
sourceHash: b0aa69ea33917e43694e75f6f279fea82bd2515a8774249fc60a27ecd403f1c3
---

Il "Santo Graal" dell'e-commerce di moda è sempre stato quello di riuscire a riprodurre l'esperienza davanti allo specchio.

Le immagini statiche — anche quelle ad alta fedeltà generate dall'IA odierna — rappresentano un enorme passo avanti. Ma manca loro l'unico elemento in grado di dare vera sicurezza all'acquirente: **la fisica.**

Il tessuto aderisce quando mi giro? La gonna svolazza quando cammino? Come riflette la luce il velluto quando mi muovo?

Questa settimana (26 gennaio), [Decart AI](https://decart.ai/) ha lanciato una bomba che ci avvicina a rispondere a queste domande in tempo reale. Hanno rilasciato ufficialmente [Lucy 2.0](https://lucy.decart.ai/), un "modello di trasformazione del mondo in tempo reale" che sposta il video generativo dal rendering offline all'interazione live.

Sebbene i video dimostrativi mostrino gamer che cambiano skin su Twitch o trasformano le loro stanze in città cyberpunk, le implicazioni per il settore della moda sono innegabili.

_Demo di Lucy 2.0 su LinkedIn:_  
<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7422224206010028032?collapsed=1" height="895" width="504" frameborder="0" allowfullscreen="" title="Lucy 2.0 demo"></iframe>

## Cos'è Lucy 2.0?

Lucy 2.0 è un modello video generativo che non si limita a creare video: *riveste* la realtà dal vivo.

Utilizzando il feed di una normale webcam, può scambiare outfit, cambiare sfondi o alterare attributi fisici a **30 frame al secondo (fps)** con risoluzione 1080p.

A differenza della tradizionale AR (Realtà Aumentata), che sovrappone un modello 3D rigido sulla persona (spesso simile a un adesivo fluttuante), Lucy 2.0 utilizza la **diffusione pura**. "Comprende" la fisica del mondo attraverso previsioni a livello di pixel.
* Sa come una cerniera separa il tessuto quando ti giri.
* Sa come dovrebbe piegarsi un abito quando ti siedi.
* E fa tutto questo senza mappe di profondità, green screen o mesh 3D.

Il risultato? Uno "specchio magico" in cui puoi vederti indossare qualsiasi capo, muovendoti in modo naturale, con una latenza quasi pari a zero (meno di 40 ms).

## L'Ostacolo: I costi di calcolo (0,05 $/sec)

Se questa tecnologia esiste, perché non è già su tutti i negozi Shopify?

**Il prezzo.**

Far girare un modello come Lucy 2.0 richiede un'immensa potenza GPU (è stato addestrato e dimostrato su enormi cluster che utilizzano NVIDIA H100 e l'infrastruttura di Crusoe Cloud).

Stando agli attuali prezzi delle API di Decart per l'editing video in tempo reale:
* **Costo:** Circa **0,05 $ al secondo**.

Facciamo i conti per una tipica sessione e-commerce:
* Un utente passa 3 minuti (180 secondi) a "provare" diversi outfit.
* Costo Totale: **9,00 $ per sessione utente.**

Per un merchant, questo è insostenibile. Nell'e-commerce di moda, dove i margini sono ristretti, non puoi pagare 9 $ solo per far *guardare* un prodotto a un cliente.

## Il Futuro: L'obiettivo di 0,20 $

Tuttavia, nel mondo dell'IA, l'insostenibile di oggi è lo standard di domani.

Stiamo già assistendo a un crollo dei costi per la generazione di immagini. I video saranno i prossimi. Man mano che l'hardware migliora (basti pensare ai chip "Sohu" di Etched, progettati specificamente per i transformer) e i modelli diventano più efficienti, quei 0,05 $/secondo scenderanno rapidamente.

**Il numero magico: 0,20 $ a sessione.**

Se il costo scendesse a circa 0,20 $ a sessione, il discorso cambierebbe completamente.
* Se una sessione di Virtual Try-On aumenta il conversion rate del 2% o previene un costo di spedizione per un reso di 15 $, pagare 0,20 $ per quell'esperienza diventa una scelta ovvia.

## Cosa significa questo per Genlook

Noi di **Genlook** siamo ossessionati da questa traiettoria.

Attualmente, offriamo un'esperienza di virtual try-on **statico** leader di mercato. Genera risultati ad alta fedeltà istantaneamente e a costi accessibili. Questa è la soluzione corretta per il 2026.

Ma sappiamo che il 2027 si avvicina.

Crediamo che nel giro di pochi mesi vedremo versioni ottimizzate o open-source di modelli come Lucy 2.0. Quando il prezzo raggiungerà quella soglia di sostenibilità, saremo pronti a integrare questa funzionalità direttamente nella nostra app per Shopify.

Immagina i tuoi clienti che aprono la pagina del tuo prodotto, accendono la webcam e vedono la tua nuova collezione direttamente su di loro, dal vivo.

## In Sintesi

Lucy 2.0 di Decart AI è uno sguardo al prossimo futuro.
* **La Tecnologia:** Generazione video in tempo reale con fisica perfetta (30fps).
* **I Vantaggi:** Nessun modello 3D necessario, gratificazione immediata, alto engagement.
* **Gli Svantaggi:** Attualmente troppo costoso per il retail (0,05 $/sec).
* **La Previsione:** I prezzi crolleranno e questo diventerà lo standard per il fashion retail di fascia alta entro il 2027.

Merchant, preparatevi. Lo specchio sta arrivando online.

---

*Finché il video in tempo reale non diventerà economicamente accessibile, puoi comunque offrire ai tuoi clienti la migliore alternativa sul mercato. [Prova Genlook gratuitamente](https://apps.shopify.com/genlook-virtual-try-on?utm_source=g_landing&utm_medium=website&utm_campaign=blog-decart-ai-lucy-2-realtime-virtual-try-on) e lascia che provino i tuoi vestiti usando le loro foto già da oggi.*