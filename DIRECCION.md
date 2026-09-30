# KOFULL — Dirección y mapa de experiencia

## FASE 02 · Dirección artística

**Idea:** la web es un combate a 5 rounds visto como una película. Un solo objeto con luz (la lata) en un espacio negro. El color lo trae el producto, nunca la interfaz.

### Paleta
| Token | Valor | Uso |
|---|---|---|
| `--black` | `#070708` | Fondo base. Negro de pabellón apagado, no puro. |
| `--ink` | `#0e0e10` | Planos secundarios. |
| `--graphite` | `#1a1b1e` | Líneas, marcos, HUD apagado. |
| `--metal` | `#8d9096` | Texto secundario, datos. |
| `--metal-hi` | `#d3d5d9` | Texto sobre negro en tamaño pequeño. |
| `--white` | `#f2f1ee` | Titulares (blanco papel, no #fff). |
| `--kofull-red` | `#d10f18` | El rojo de la tinta de la lata. Acento: 1 palabra por pantalla, CTA, progreso. |
| `--dark-red` | `#5c0508` | Luz ambiental roja, rim light. |
| `--ice` | `#8fb6d8` | Solo en Recuperación. |
| Sabores | `#d10f18` · `#ec4806` · `#70be10` · `#083cd2` | Muestreados de las latas reales. |

Rojo evaluado: carmesí de sangre (#8a060c) resulta sucio sobre negro; rojo deportivo (#ff2a2a) resulta barato. Se usa **el rojo exacto de la tinta** para que la web y la lata sean el mismo objeto.

### Tipografía
- **Display:** Archivo (variable: `wdth` 62–125 y `wght` 100–900, itálica). Se usa en dos registros: *condensada negra* para gritar (ROUND, VUELVE) y *expandida itálica negra* que rima con el «SABOR» de la lata.
- **Texto:** Geist 400/500. Neutro y técnico.
- **Datos/HUD:** Geist Mono. Reloj de round, mg, coordenadas.
- Descartadas: Bebas Neue, Oswald y Anton (tipografía de gimnasio). La skill proponía Bebas + Barlow y **no se ha seguido** por ese motivo.

### Luz y materiales (3D)
- Estudio negro con softboxes verticales, que dan los brillos en banda de la foto de producto, y un rim rojo detrás.
- Lata modelada a medida (473 mL: Ø66 × 168 mm). Etiqueta real en 4K con escalado Real-ESRGAN, pintura blanca con clearcoat. **Las gotas son geometría de luz real** (clearcoat normal map procedural), no una textura pintada.
- Aluminio en el cuello, la anilla y el fondo, con condensación.

### Fotografía (placeholders)
Documental y editorial, con flash duro, 85–135 mm, grano. Cada hueco lleva escrita su dirección de foto («Vendas, macro, flash directo, 6:40») para sustituirlo sin reinterpretar. Las fotos de producto reales (latas sobre color) se usan en la tienda.

### Movimiento
Dos tempos: **golpe** (cortes, flash blanco, 0,4–0,6 s, `expo`) y **respiración** (Recuperación: 2× más scroll por idea, `sine`, deriva lenta). La cámara nunca se mueve sola salvo una flotación mínima. Todo lo demás lo mueve el scroll.

### Sonido (sintetizado con WebAudio, sin archivos, apagado por defecto)
Campana (cambio de round), golpe sordo (flash), *pssst* de lata (primer scroll), respiración y agua (Recuperación), clic metálico (cambio de sabor).

### Valencia
Sin postales. Luz de farola de sodio sobre la lata, línea de horizonte del mar, coordenadas 39.4699 N · 0.3763 W y «HECHO EN VALENCIA» en una sola pantalla.

## FASE 03 · Mapa de escenas

| # | Escena | Qué ve | Qué hace el scroll / la lata | Texto | Sonido | Móvil |
|---|---|---|---|---|---|---|
| 00 | Loader | Negro, reloj 00:00→ | Carga real de texturas | KOFULL · ROUND 01 | – | Igual |
| 01 | Hero | Lata roja inclinada como en la foto, texto detrás de la lata | Gira 180° hasta el luchador, la cámara se acerca; arrastrable | ENTRENA. RECUPERA. **VUELVE.** | pssst al primer scroll | Lata abajo, texto arriba |
| 02 | Campana | La etiqueta llena la pantalla | La cámara «atraviesa» la lata; flash blanco | EL COMBATE NO TERMINA CUANDO SUENA LA CAMPANA. / Entrenar es solo una parte. | Golpe en el flash | Igual |
| 03 | Volver | Negro, lata de pie bajo luz cenital de ring | La lata se aleja desde muy cerca | RECUPERARTE ES LO QUE TE PERMITE **VOLVER.** | – | Igual |
| 04 | Rounds ×5 | Número gigante, foto documental, lata | Cada round cambia la luz y la postura (rojo→frío→rojo) | ROUND 01–05 | Campana por round | Foto a sangre, texto abajo |
| 05 | Fórmula | Macro de la columna de ingredientes de la etiqueta | La cámara baja por la etiqueta; cada ingrediente se activa al pasar | FORMULADO PARA EL ESFUERZO. + 7 ingredientes (datos de etiqueta) | – | Macro arriba, lista abajo |
| 06 | Manifiesto | Lata a contraluz, casi silueta | Frases que entran de una en una | Manifiesto | – | Igual |
| 07 | Recuperación | Azul noche, cáusticas de agua, gotas cayendo | Tempo lento, la lata gira despacio | EL ROUND TERMINA. LA RECUPERACIÓN EMPIEZA. | Agua y respiración | Igual |
| 08 | Gama ×4 | Lata sobre suelo mojado del color del sabor | Cambio de lata con giro; el ambiente cambia de color | Frutas Rojas · Mango Passion · Lima Limón · Blue Berry | Clic metálico | Igual, nombre arriba |
| 09 | Valencia | Luz de sodio y horizonte | Lata de perfil | HECHO EN VALENCIA. | – | Igual |
| 10 | Tienda | 4 paneles verticales con foto real | Canvas oculto | Nombre, sabor, función, precio provisional, COMPRAR | Clic | Carrusel horizontal |
| 11 | Final | Negro, lata flotando | Última subida de luz | READY FOR THE NEXT ROUND? | Campana final | Igual |
| 12 | Footer | Mínimo | – | KOFULL · VALENCIA — ESPAÑA · 2026 | – | Igual |

**Datos nutricionales:** los de la etiqueta, confirmados como reales por el cliente. Las declaraciones de función solo usan las autorizadas en la UE (vitaminas B, potasio, magnesio). Cafeína, BCAAs, taurina y L-carnitina se describen como composición, sin prometer efectos.
