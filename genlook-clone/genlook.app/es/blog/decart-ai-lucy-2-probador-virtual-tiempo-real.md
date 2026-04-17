---
title: 'Lucy 2.0 de Decart AI: La revolución del probador virtual en vídeo en tiempo
  real'
metaShorterTitle: 'Lucy 2.0: Probador virtual en tiempo real'
description: Decart AI acaba de lanzar Lucy 2.0, un modelo de transformación del entorno
  en tiempo real que permite cambios de ropa en vídeo en directo. Descubre qué significa
  esto para el e-commerce de moda.
date: '2026-01-28'
author: Thibault Mathian
category: Noticias del sector
image: /blog-images/lucy-2-realtime-try-on.jpg
translationOf: decart-ai-lucy-2-realtime-virtual-try-on
faq:
- question: ¿Qué es Lucy 2.0 de Decart AI?
  answer: Lanzado el 26 de enero de 2026, Lucy 2.0 es un modelo de última generación
    para la transformación de entornos en tiempo real. Utiliza IA generativa para
    transformar señales de vídeo en directo al instante, permitiendo cambios de personaje,
    de ropa y alteraciones del entorno a un máximo de 30 fps con una latencia casi
    nula.
- question: ¿En qué se diferencia Lucy 2.0 de las herramientas actuales de probador
    virtual (VTO)?
  answer: La mayoría de las herramientas VTO actuales (como Genlook) generan resultados
    de alta fidelidad en **imágenes estáticas**. Lucy 2.0 funciona sobre **transmisiones
    de vídeo en directo**, permitiendo a los usuarios girar, caminar y moverse mientras
    la IA «adapta» la ropa sobre ellos en tiempo real sin usar mallas 3D.
- question: ¿Está ya disponible Lucy 2.0 para tiendas Shopify?
  answer: No directamente. Aunque la API está activa, el coste computacional para
    la edición de vídeo en tiempo real ronda actualmente los **0,05 $ por segundo**,
    lo que resulta prohibitivamente caro para las sesiones estándar de comercio electrónico
    (unos 9,00 $ por usuario).
- question: ¿Cuándo será asequible probarse ropa en vídeo en tiempo real?
  answer: Predecimos que en un plazo de 6 a 12 meses, las técnicas de optimización,
    como la destilación de modelos y los chips de inferencia dedicados (como Sohu
    de Etched), reducirán los costes hasta un rango viable de **0,20 $ por sesión**.
sourceHash: b0aa69ea33917e43694e75f6f279fea82bd2515a8774249fc60a27ecd403f1c3
---

El «Santo Grial» del e-commerce de moda siempre ha sido replicar la experiencia frente al espejo.

Las imágenes estáticas (incluso las de alta fidelidad generadas por Inteligencia Artificial que tenemos hoy en día) suponen un salto de gigante. Pero les falta ese elemento clave que da verdadera confianza al comprador: **la física**.

¿Se ciñe la tela al darme la vuelta? ¿Tiene vuelo la falda al caminar? ¿Cómo incide la luz en el terciopelo cuando me muevo?

Esta semana (26 de enero), [Decart AI](https://decart.ai/) ha soltado una auténtica bomba que nos acerca un paso más a responder a estas preguntas en tiempo real. Han lanzado oficialmente [Lucy 2.0](https://lucy.decart.ai/), un «modelo de transformación de entornos en tiempo real» que hace evolucionar el vídeo generativo de un renderizado en diferido a una interacción en directo.

Aunque los vídeos de demostración muestran a *gamers* cambiando de *skin* en Twitch o transformando sus habitaciones en ciudades ciberpunk, las implicaciones para el retail de moda son innegables.

_Demostración de Lucy 2.0 en LinkedIn:_  
<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7422224206010028032?collapsed=1" height="895" width="504" frameborder="0" allowfullscreen="" title="Lucy 2.0 demo"></iframe>

## ¿Qué es Lucy 2.0?

Lucy 2.0 es un modelo de vídeo generativo que no se limita a crear vídeo, sino que *rediseña* la realidad en directo.

Utilizando la señal de una webcam estándar, puede cambiar conjuntos de ropa, modificar fondos o alterar atributos físicos a **30 fotogramas por segundo (fps)** en resolución 1080p.

A diferencia de la realidad aumentada (AR) tradicional, que superpone un modelo 3D rígido sobre ti (y que a menudo parece una pegatina flotante), Lucy 2.0 utiliza **difusión pura** (*pure diffusion*). «Entiende» la física del mundo real mediante la predicción a nivel de píxel.
* Sabe cómo una cremallera separa la tela al girar.
* Sabe cómo debe doblarse un vestido al sentarse.
* Y lo hace sin necesidad de usar mapas de profundidad, cromas verdes ni mallas 3D.

¿El resultado? Un «espejo mágico» donde puedes verte llevando cualquier prenda, moviéndote de forma natural y con una latencia casi nula (menos de 40 ms).

## La barrera: El coste computacional (0,05 $/seg)

Si esta tecnología ya existe, ¿por qué no está hoy mismo en todas las tiendas Shopify?

**Por el precio.**

Ejecutar un modelo como Lucy 2.0 requiere una potencia de GPU inmensa (se ha entrenado y probado en enormes clústeres usando NVIDIA H100 y la infraestructura de Crusoe Cloud).

Según los precios actuales de la API de Decart para la edición de vídeo en tiempo real:
* **Coste:** Aprox. **0,05 $ por segundo**.

Hagamos números para una sesión típica de e-commerce:
* Un usuario pasa 3 minutos (180 segundos) «probándose» diferentes conjuntos de ropa.
* Coste total: **9,00 $ por sesión de usuario.**

Para un comerciante, eso es insostenible. En el e-commerce de moda, donde los márgenes son ajustados, no puedes pagar 9 $ solo para que un cliente *mire* un producto.

## El futuro: El objetivo de 0,20 $

Sin embargo, en el mundo de la Inteligencia Artificial, lo que hoy es «insostenible» mañana será el estándar.

Ya estamos viendo cómo el coste de generación de imágenes cae en picado. El vídeo es el siguiente paso. A medida que el hardware mejore (fijémonos en los chips «Sohu» de Etched diseñados específicamente para modelos *transformer*) y los modelos sean más eficientes, esos 0,05 $/seg bajarán rápidamente.

**El número mágico: 0,20 $ por sesión.**

Si el coste se reduce a unos 0,20 $ por sesión, las matemáticas cambian por completo.
* Si una sesión de probador virtual (VTO) aumenta la tasa de conversión en un 2% o evita los 15 $ de coste de envío de una devolución, pagar 0,20 $ por esa experiencia es una decisión obvia.

## Qué significa esto para Genlook

En **Genlook**, estamos obsesionados con esta evolución.

Actualmente, ofrecemos la experiencia de probador virtual **estático** líder del mercado. Crea resultados de alta fidelidad al instante y a un precio asequible. Esta es la solución ideal para 2026.

Pero sabemos lo que nos depara 2027.

Creemos que, en cuestión de meses, veremos versiones optimizadas o de código abierto de modelos como Lucy 2.0. Cuando el precio alcance ese umbral viable, estaremos listos para integrar esta capacidad directamente en nuestra app de Shopify.

Imagina a tus clientes abriendo la página de tu producto, encendiendo su webcam y viendo tu nueva colección puesta en sí mismos, en directo.

## Resumen

Lucy 2.0 de Decart AI es un vistazo al futuro cercano.
* **La tecnología:** Generación de vídeo en tiempo real con una física perfecta (30 fps).
* **Los pros:** No se necesitan modelos 3D, gratificación instantánea, alto nivel de *engagement*.
* **Los contras:** Actualmente es demasiado caro para el retail (0,05 $/seg).
* **La predicción:** Los precios caerán en picado y esto se convertirá en el estándar para el e-commerce de moda de alta gama en 2027.

Comerciantes, preparaos. El espejo se está conectando a internet.

---

*Hasta que el vídeo en tiempo real sea asequible, puedes seguir ofreciendo a tus clientes la mejor alternativa actual. [Prueba Genlook gratis](https://apps.shopify.com/genlook-virtual-try-on?utm_source=g_landing&utm_medium=website&utm_campaign=blog-decart-ai-lucy-2-realtime-virtual-try-on) y deja que se prueben tu ropa usando sus fotos hoy mismo.*