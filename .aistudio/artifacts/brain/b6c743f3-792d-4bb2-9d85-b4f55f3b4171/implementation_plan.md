# Búsqueda por Voz Directa e Instantánea para FarmaciaDB

Transformación completa del sistema de búsqueda por voz en el Punto de Venta (POS) y en Inventario para que funcione de manera directa, sin ventanas emergentes ni modales: presionar el micrófono, hablar y ver los productos filtrados al instante.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisiones confirmadas por el usuario:**
> - **Flujo de interacción**: Modo directo (presionar micrófono, hablar y buscar inmediatamente sin modales ni pasos intermedios).
> - **Plataforma objetivo**: Google Chrome en computadora de escritorio.
> - **Cero fallbacks forzados**: Eliminación total de cualquier asignación automática a medicamentos fijos (como "Panadol Extra"). Si el usuario dice "Advil", busca Advil; si dice "Amoxil", busca Amoxil.

---

## 1. Overview & Core Concept

- **Qué hace**: Permite a los cajeros y dependientes de la farmacia buscar medicamentos en el catálogo simplemente pulsando el icono del micrófono junto a la barra de búsqueda, diciendo el nombre comercial o principio activo, y obteniendo el listado filtrado al instante.
- **Audiencia objetivo**: Personal de farmacia y dependientes que necesitan velocidad máxima al atender a clientes en mostrador sin despegar las manos del flujo de venta.
- **Valor clave**: Cero fricción, reducción del tiempo de búsqueda a menos de 2 segundos, y eliminación de ventanas emergentes que interrumpan el proceso de cobro.

---

## 2. User Experience & Visual Design

### Flujo de Usuario Directo (Punto de Venta e Inventario)

1. **Estado Inicial (Reposo)**:
   - El icono del micrófono se ubica dentro de la barra de búsqueda como un botón de acción rápida con icono `Mic` en tono primario.
2. **Pulsación (Escuchando)**:
   - Al hacer clic, el botón cambia de inmediato a color rojo pulsante con una onda de sonido animada (`Mic` con aura `ring-destructive`).
   - El `placeholder` de la barra de búsqueda cambia dinámicamente a: *«🎙️ Escuchando... Di el nombre del medicamento»*.
3. **Reconocimiento en Vivo**:
   - Mientras el usuario habla, las palabras aparecen en tiempo real dentro del campo de texto de búsqueda.
4. **Finalización Automática (Búsqueda)**:
   - Al detectar una pausa natural en la voz (evento `onend` de Chrome), el sistema:
     - Normaliza el texto y remueve palabras innecesarias (*"buscar"*, *"dame"*, *"quiero"*).
     - Asocia el principio activo si aplica (ej. *"paracetamol"* → *"Panadol"*).
     - Actualiza el filtro de productos de la pantalla inmediatamente.
     - Suena un sonido sutil de confirmación y el botón vuelve a su estado normal.
5. **Manejo de Permisos en iFrame**:
   - Si Chrome bloquea el micro en la vista previa embebida, aparece un tooltip flotante no invasivo directamente bajo el botón con la opción de abrir en pestaña completa con 1 clic.

---

## 3. Key Product Decisions & Trade-Offs

- **Búsqueda Directa en la Barra vs. Modal Emergente**:
  - *Decisión elegida*: Integración directa en el input de búsqueda.
  - *Razón*: El usuario confirmó explícitamente que no desea modales ni ventanas emergentes. La experiencia debe asemejarse a la barra de búsqueda por voz de Google o aplicaciones móviles nativas.
- **Normalización de Texto y Acentos**:
  - *Decisión elegida*: Normalización NFD y eliminación de diacríticos tanto en la entrada de voz como en la base de datos de medicamentos.
  - *Razón*: Evita que la falta de tilde en una palabra reconocida (*"losartan"* vs *"Losartán"*) impida encontrar el medicamento.
- **Soporte de Principio Activo y Marcas Comerciales**:
  - *Decisión elegida*: Si el usuario pronuncia el principio activo (*"amoxicilina"*), el filtro busca en las columnas `nombre`, `principio`, `categoria` y `codigo`, mostrando tanto los genéricos como los de marca.

---

## 4. Technical Architecture & Data Strategy

### Diagrama de Flujo del Reconocimiento de Voz

```
┌─────────────────────────────────────────────────────────────┐
│                 Punto de Venta / Inventario                 │
│                                                             │
│   ┌───────────────────────────────────┬─────────────────┐   │
│   │ [Search] Buscar producto...       │  [🎙️ Mic Icon]  │   │
│   └───────────────────────────────────┴─────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Click en micrófono
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            VoiceButton (SpeechRecognition Hook)             │
│                                                             │
│   1. Activa SpeechRecognition (es-419 / es-GT)              │
│   2. Transcribe en tiempo real directo al Input             │
│   3. Detecta pausa / fin de habla                           │
│   4. Normaliza texto y limpia prefijos                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ onText(limpio)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Motor de Filtro Reactivo                    │
│                                                             │
│   filtered = meds.filter(m =>                               │
│     normalize(m.nombre + m.principio + m.categoria)         │
│     .includes(normalize(textoVoz))                          │
│   )                                                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Renderiza
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Grid de Medicamentos Actualizado                │
│    [Panadol Extra]   [Advil]   [Amoxil]   [Omeprazol]       │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Involucrados:
- **`src/components/VoiceButton.tsx`**: Rediseñado como un botón compacto sin modal, con estados visuales claros (reposo, escuchando, procesando), manejo de `SpeechRecognition` continuo, y callback directo al input de búsqueda.
- **`src/routes/_app.pos.tsx`**: Integración con el estado `query` y `setQuery` con auto-enfoque y filtrado inmediato.
- **`src/routes/_app.inventario.tsx`**: Integración con el estado `search` y `setSearch` con soporte para principios activos y marcas.
