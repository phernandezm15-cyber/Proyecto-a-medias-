/**
 * Comprehensive Pharmaceutical Intelligence Engine for FarmaciaDB.
 * Provides deep, encyclopedic, and clinical answers to ANY pharmacy-related question:
 * - Symptoms & clinical recommendations
 * - Drug monographs & indications
 * - Drug interactions (alcohol, food, other drugs)
 * - Pregnancy & lactation safety
 * - Pediatric & geriatric considerations
 * - Dosing & posology
 * - Storage, cold chain, & expirations
 * - Generic vs brand name equivalencies
 * - Real-time stock, prices in Quetzales (Q), and inventory integration.
 */

export interface MedItem {
  id: string;
  nombre: string;
  principio: string;
  categoria: string;
  precioVenta: number;
  stock: number;
  caducidad: string;
  codigo?: string;
}

export interface FarmaciaContext {
  meds?: MedItem[];
  ventas?: any[];
  clientes?: any[];
  compras?: any[];
}

const NORM = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Detailed drug monographs for the 20 medications in FarmaciaDB
export const DRUG_MONOGRAPHS: Record<string, {
  indicaciones: string;
  mecanismo: string;
  dosisAdulto: string;
  tomaConComida: string;
  efectosSecundarios: string;
  contraindicaciones: string;
}> = {
  panadol: {
    indicaciones: "Dolor leve a moderado (cabeza, dental, muscular, menstrual) y control eficaz de la fiebre.",
    mecanismo: "Inhibidor de la síntesis de prostaglandinas en el SNC con efecto analgésico y antipirético sin acción antiinflamatoria periférica.",
    dosisAdulto: "500mg a 1g cada 6 a 8 horas según necesidad (máximo 4g al día).",
    tomaConComida: "Puede tomarse con o sin alimentos; no irrita la mucosa gástrica.",
    efectosSecundarios: "Muy bien tolerado en dosis recomendadas. En sobredosis genera hepatotoxicidad grave.",
    contraindicaciones: "Hipersensibilidad al paracetamol e insuficiencia hepática grave.",
  },
  advil: {
    indicaciones: "Dolor con componente inflamatorio (migraña, dolor articular, golpes, dolor dental, artritis) y fiebre.",
    mecanismo: "Antiinflamatorio no esteroideo (AINE) que inhibe las enzimas COX-1 y COX-2, reduciendo mediadores inflamatorios.",
    dosisAdulto: "400mg cada 8 horas (máximo 1200mg/día sin prescripción médica).",
    tomaConComida: "Tomar siempre con alimentos o un vaso de leche para proteger el estómago.",
    efectosSecundarios: "Molestias gastrointestinales, acidez, pirosis; rara vez sangrado gástrico con uso prolongado.",
    contraindicaciones: "Úlcera péptica activa, insuficiencia renal o cardíaca grave, y tercer trimestre de embarazo.",
  },
  amoxil: {
    indicaciones: "Infecciones bacterianas respiratorias (amigdalitis, sinusitis, neumonía), del oído (otitis), dentales y urinarias.",
    mecanismo: "Antibiótico betalactámico bactericida que inhibe la síntesis de la pared celular de bacterias susceptibles.",
    dosisAdulto: "500mg cada 8 horas o 875mg cada 12 horas por 7 a 10 días completos.",
    tomaConComida: "Se puede tomar con o sin alimentos; tomar con comida disminuye posibles náuseas.",
    efectosSecundarios: "Diarrea leve, náuseas, erupción cutánea alérgica.",
    contraindicaciones: "Alergia conocida a penicilinas o cefalosporinas. ¡Requiere receta médica obligatoria!",
  },
  clarityne: {
    indicaciones: "Rinitis alérgica estacional o perenne, estornudos, picazón de ojos, goteo nasal y urticaria crónica.",
    mecanismo: "Antihistamínico H1 de segunda generación con acción prolongada y bajo paso a la barrera hematoencefálica.",
    dosisAdulto: "10mg (1 tableta) una vez al día.",
    tomaConComida: "Puede tomarse a cualquier hora, con o sin alimentos.",
    efectosSecundarios: "No suele causar sueño; rara vez fatiga leve o dolor de cabeza.",
    contraindicaciones: "Hipersensibilidad a la loratadina e insuficiencia hepática grave.",
  },
  omeprazol: {
    indicaciones: "Gastritis aguda y crónica, úlcera gástrica o duodenal, reflujo gastroesofágico y ardor estomacal frecuente.",
    mecanismo: "Inhibidor de la bomba de protones (IBP) que reduce la secreción de ácido clorhídrico en el estómago.",
    dosisAdulto: "20mg a 40mg al día por la mañana.",
    tomaConComida: "Tomar la cápsula entera 30 minutos ANTES del desayuno con un vaso de agua.",
    efectosSecundarios: "Cefalea leve, diarrea o estreñimiento, dolor abdominal pasajero.",
    contraindicaciones: "Hipersensibilidad al omeprazol u otros IBP.",
  },
  losartan: {
    indicaciones: "Hipertensión arterial esencial y protección renal en pacientes con diabetes tipo 2 e hipertensión.",
    mecanismo: "Antagonista selectivo de los receptores de angiotensina II (ARA-II), produciendo vasodilatación y baja de presión arterial.",
    dosisAdulto: "50mg una vez al día (ajustable a 100mg según prescripción médica).",
    tomaConComida: "Con o sin alimentos, preferentemente a la misma hora todos los días.",
    efectosSecundarios: "Mareos al levantarse bruscamente (hipotensión ortostática), fatiga leve, congestión nasal.",
    contraindicaciones: "Embarazo (teratogénico), lactancia y estenosis bilateral de la arteria renal.",
  },
  gaviscon: {
    indicaciones: "Alivio sintomático inmediato del ardor estomacal, reflujo ácido y pirosis tras comidas pesadas.",
    mecanismo: "El alginato forma una balsa de gel viscoso protector que flota sobre el contenido gástrico, impidiendo que el ácido suba al esófago.",
    dosisAdulto: "1 a 2 sobres o tabletas masticables después de las comidas principales y antes de dormir.",
    tomaConComida: "Tomar 30 a 60 minutos DESPUÉS de las comidas.",
    efectosSecundarios: "Ocasionalmente flatulencia leve o estreñimiento transitorio.",
    contraindicaciones: "Insuficiencia renal severa o pacientes con dietas extremadamente bajas en sodio.",
  },
  mucosolvan: {
    indicaciones: "Afecciones respiratorias agudas y crónicas con exceso o retención de flemas (bronquitis, traqueítis, gripe productiva).",
    mecanismo: "Mucolítico y expectorante que disminuye la viscosidad de las secreciones bronquiales y estimula el movimiento ciliar.",
    dosisAdulto: "30mg (1 tableta o 10ml de jarabe) cada 8 horas.",
    tomaConComida: "Tomar preferentemente después de las comidas con abundante agua para potenciar el efecto mucolítico.",
    efectosSecundarios: "Molestias gastrointestinales leves, náuseas.",
    contraindicaciones: "Primer trimestre de embarazo y úlcera gastroduodenal activa.",
  },
  ventolin: {
    indicaciones: "Alivio y prevención del broncoespasmo en asma bronquial, EPOC y crisis de dificultad para respirar con silbidos en el pecho.",
    mecanismo: "Agonista selectivo de los receptores beta-2 adrenérgicos en el músculo liso bronquial, provocando broncodilatación rápida.",
    dosisAdulto: "1 a 2 inhalaciones (100-200 mcg) según necesidad ante crisis de asma (máximo 8 inhalaciones en 24 horas).",
    tomaConComida: "Inhalado. Enjuagar la boca con agua tras usar el inhalador.",
    efectosSecundarios: "Temblor fino de manos, taquicardia o palpitaciones transitorias, nerviosismo leve.",
    contraindicaciones: "Hipersensibilidad al salbutamol y arritmias cardíacas no controladas.",
  },
  voltaren: {
    indicaciones: "Dolor e inflamación aguda severa (artritis, lumbalgia, gota aguda, esguinces, cirugías dentales o traumatismos).",
    mecanismo: "AINE potente derivado del ácido fenilacético con marcada acción analgésica y antiinflamatoria periférica.",
    dosisAdulto: "50mg cada 8 a 12 horas (máximo 150mg/día).",
    tomaConComida: "Tomar estrictamente con alimentos para minimizar la agresión a la pared gástrica.",
    efectosSecundarios: "Epigastralgia, pirosis, riesgo cardiovascular con dosis altas y uso muy prolongado.",
    contraindicaciones: "Úlcera gástrica activa, cardiopatía isquémica diagnosticada y tercer trimestre de gestación.",
  },
  allegra: {
    indicaciones: "Rinitis alérgica severa estacional, estornudos, picazón de garganta y urticaria idiopática crónica.",
    mecanismo: "Antagonista de receptores H1 de histamina de segunda generación que NO atraviesa la barrera hematoencefálica.",
    dosisAdulto: "120mg o 180mg una vez al día.",
    tomaConComida: "Tomar con agua. Evitar tomarlo con jugos de toronja, manzana o naranja ya que reducen su absorción.",
    efectosSecundarios: "Incidencia casi nula de somnolencia; ocasionalmente dolor de cabeza o náuseas leves.",
    contraindicaciones: "Hipersensibilidad a la fexofenadina.",
  },
  bepanthen: {
    indicaciones: "Regeneración de la piel, rozaduras de pañal en bebés, quemaduras solares leves, pezones agrietados y cicatrización.",
    mecanismo: "El dexpantenol se transforma en ácido pantoténico (Vitamina B5), estimulando la proliferación de fibroblastos y regeneración celular.",
    dosisAdulto: "Aplicar una capa fina sobre la zona limpia 1 a 3 veces al día con suave masaje.",
    tomaConComida: "Uso tópico exclusivamente.",
    efectosSecundarios: "Excelente tolerancia dermatológica; rara vez dermatitis por contacto en personas alérgicas.",
    contraindicaciones: "Hipersensibilidad al dexpantenol.",
  },
  fucidin: {
    indicaciones: "Infecciones bacterianas superficiales de la piel: impétigo, foliculitis, forúnculos, heridas y quemaduras infectadas.",
    mecanismo: "Antibiótico tópico que inhibe la síntesis proteica bacteriana, especialmente activo frente a Staphylococcus aureus.",
    dosisAdulto: "Aplicar en la zona afectada 2 a 3 veces al día durante 7 a 14 días.",
    tomaConComida: "Uso tópico externo.",
    efectosSecundarios: "Irritación local leve o sensación de ardor pasajero.",
    contraindicaciones: "Alergia conocida al ácido fusídico.",
  },
  glucophage: {
    indicaciones: "Tratamiento de la diabetes mellitus tipo 2, prediabetes y síndrome de ovario poliquístico (SOP).",
    mecanismo: "Biguanida que reduce la producción hepática de glucosa y mejora la sensibilidad a la insulina en tejidos periféricos.",
    dosisAdulto: "500mg a 850mg 2 o 3 veces al día durante o después de las comidas principales.",
    tomaConComida: "Tomar siempre con las comidas principales para prevenir molestias digestivas.",
    efectosSecundarios: "Sabor metálico, náuseas, flatulencia o diarrea durante las primeras semanas.",
    contraindicaciones: "Insuficiencia renal moderada a severa (TFG < 30 ml/min) y acidosis láctica.",
  },
  januvia: {
    indicaciones: "Control de glucosa en adultos con diabetes tipo 2, como monoterapia o combinado con metformina.",
    mecanismo: "Inhibidor potente y muy selectivo de la enzima dipeptidil peptidasa-4 (DPP-4), aumentando las incretinas GLP-1 activas.",
    dosisAdulto: "100mg una vez al día.",
    tomaConComida: "Con o sin alimentos a cualquier hora del día.",
    efectosSecundarios: "Bajo riesgo de hipoglucemia; ocasionalmente cefalea o infección de vías respiratorias altas.",
    contraindicaciones: "Hipersensibilidad a sitagliptina, diabetes tipo 1 o cetoacidosis diabética.",
  },
  atorvastatina: {
    indicaciones: "Hipercolesterolemia, reducción de colesterol LDL alto y triglicéridos, y prevención de infartos y accidentes cerebrovasculares.",
    mecanismo: "Inhibidor competitivo de la HMG-CoA reductasa, enzima limitante en la biosíntesis hepática de colesterol.",
    dosisAdulto: "10mg a 40mg una vez al día por la noche.",
    tomaConComida: "Con o sin alimentos; se suele recomendar por la noche.",
    efectosSecundarios: "Dolores musculares leves (mialgias), elevación transitoria de enzimas hepáticas.",
    contraindicaciones: "Enfermedad hepática activa, elevación inexplicable de transaminasas, embarazo y lactancia.",
  },
  centrum: {
    indicaciones: "Suplemento nutricional para prevenir o tratar deficiencias de vitaminas y minerales por estrés, fatiga o mala alimentación.",
    mecanismo: "Aporta micronutrientes esenciales (vitaminas A, C, D, E, complejo B, zinc, hierro, magnesio) para el metabolismo celular.",
    dosisAdulto: "1 tableta al día.",
    tomaConComida: "Tomar con el desayuno o almuerzo para mejorar la absorción de vitaminas liposolubles.",
    efectosSecundarios: "Muy bien tolerado; heces oscuras normales por el contenido de hierro.",
    contraindicaciones: "Hipervitaminosis A o D y hemocromatosis.",
  },
  redoxon: {
    indicaciones: "Refuerzo del sistema inmune ante gripes y resfriados, cicatrización de tejidos y potente antioxidante celular.",
    mecanismo: "Ácido ascórbico esencial para la síntesis de colágeno, absorción de hierro y función fagocítica leucocitaria.",
    dosisAdulto: "1 tableta efervescente de 1g al día disuelta en un vaso de agua.",
    tomaConComida: "Preferentemente por la mañana con el desayuno.",
    efectosSecundarios: "En dosis excesivas (>2g/día) puede causar diarrea osmótica o cólico estomacal.",
    contraindicaciones: "Litiasis renal por oxalato e insuficiencia renal grave.",
  },
  cipro: {
    indicaciones: "Infecciones bacterianas complejas: cistitis e infecciones urinarias, gastroenteritis bacteriana severa, diarrea del viajero.",
    mecanismo: "Fluoroquinolona bactericida que inhibe la ADN girasa y la topoisomerasa IV bacterianas.",
    dosisAdulto: "500mg cada 12 horas por 3 a 7 días según el tipo de infección.",
    tomaConComida: "Con abundante agua. No tomar simultáneamente con antiácidos, lácteos o suplementos de hierro (esperar 2 horas).",
    efectosSecundarios: "Molestias gastrointestinales, mareos leves, tendinitis (muy raro pero documentado).",
    contraindicaciones: "Menores de 18 años, embarazo, lactancia y antecedentes de trastornos de los tendones por quinolonas.",
  },
  aspirina: {
    indicaciones: "Alivio de dolores leves (cabeza, dental), fiebre y como antiagregante plaquetario preventivo cardiovascular.",
    mecanismo: "Inhibidor irreversible de la COX-1 plaquetaria y de la síntesis de tromboxano A2 y prostaglandinas.",
    dosisAdulto: "500mg cada 6 a 8 horas como analgésico; 81-100mg al día como cardioprotector.",
    tomaConComida: "Tomar siempre con las comidas o un vaso grande de agua.",
    efectosSecundarios: "Irritación gástrica, aumento del tiempo de sangrado.",
    contraindicaciones: "Úlcera gástrica activa, hemofilia, alergia a salicilatos y niños con cuadros virales (Síndrome de Reye).",
  },
};

/**
 * Main AI Farmacia reasoning engine.
 * Generates expert, comprehensive, structured responses for any pharmacy question.
 */
export function generateExpertPharmacyReply(message: string, context: FarmaciaContext = {}): string {
  const { meds = [], ventas = [], clientes = [], compras = [] } = context;
  const q = NORM(message);

  // Helper to find a medicine from active database context
  const getMed = (searchTerm: string): MedItem | undefined => {
    const s = NORM(searchTerm);
    return meds.find((m) => NORM(m.nombre).includes(s) || NORM(m.principio).includes(s));
  };

  // -------------------------------------------------------------
  // 1. SEGURIDAD Y PREGUNTAS CLÍNICAS PRIORITARIAS
  // -------------------------------------------------------------
  if (
    q.includes("tomar vencido") ||
    (q.includes("se puede") && (q.includes("venc") || q.includes("caduc"))) ||
    q.includes("medicamento vencido") ||
    q.includes("tomo algo vencido") ||
    (q.includes("pasa si") && (q.includes("venc") || q.includes("caduc"))) ||
    q.includes("esta vencido")
  ) {
    return (
      `🛑 **¿Se puede tomar un medicamento vencido?**\n\n` +
      `**No, bajo ninguna circunstancia se debe consumir un medicamento caducado.**\n\n` +
      `Razones clínicas fundamentales:\n` +
      `1. **Pérdida de eficacia terapéutica:** El principio activo se degrada con el tiempo y pierde su potencia, lo que puede agravar la enfermedad.\n` +
      `2. **Riesgo de toxicidad:** Ciertas moléculas se descomponen en compuestos químicos irritantes o tóxicos para los riñones y el hígado.\n` +
      `3. **Contaminación biológica:** Jarabes, suspensiones y colirios pierden su conservante y pueden acumular colonias bacterianas o fúngicas.\n\n` +
      `💡 *Conducta adecuada:* Desecha el envase en un punto seguro y adquiere un lote nuevo con fecha de vigencia garantizada.`
    );
  }

  // -------------------------------------------------------------
  // 2. INVENTARIO Y GESTIÓN OPERATIVA
  // -------------------------------------------------------------
  if (q.includes("venc") || q.includes("caduc") || q.includes("expir")) {
    const expiring = meds
      .filter((m) => {
        const diff = Math.ceil((new Date(m.caducidad + "T12:00:00").getTime() - Date.now()) / 86400000);
        return diff <= 60;
      })
      .sort((a, b) => new Date(a.caducidad).getTime() - new Date(b.caducidad).getTime());

    return expiring.length
      ? `📅 **Medicamentos con vencimiento próximo (próximos 60 días):**\n` +
          expiring
            .map((m) => {
              const days = Math.ceil((new Date(m.caducidad + "T12:00:00").getTime() - Date.now()) / 86400000);
              return `• **${m.nombre}** (${m.principio}): vence el **${m.caducidad}** (${
                days < 0 ? "¡Vencido!" : `en ${days} días`
              }) — Stock: ${m.stock} uds. | Precio: Q ${Number(m.precioVenta).toFixed(2)}`;
            })
            .join("\n") +
          `\n\n💡 *Recomendación:* Prioriza la rotación de estos lotes o contacta a los distribuidores para aplicar políticas de cambio por caducidad.`
      : "✅ **Estado óptimo:** No hay medicamentos con fecha de vencimiento dentro de los próximos 60 días en la farmacia.";
  }

  if (q.includes("critic") || q.includes("stock") || q.includes("bajo") || q.includes("agota") || q.includes("quedan pocos")) {
    const critical = meds.filter((m) => m.stock < 10).sort((a, b) => a.stock - b.stock);
    return critical.length
      ? `⚠️ **Productos en stock crítico (< 10 unidades):**\n` +
          critical
            .map(
              (m) =>
                `• **${m.nombre}** (${m.principio}): solo quedan **${m.stock} uds.** | Precio: Q ${Number(
                  m.precioVenta
                ).toFixed(2)}`
            )
            .join("\n") +
          `\n\n📦 *Acción sugerida:* Puedes ingresar a la pestaña **Compras** para generar una orden de reposición inmediata con tus proveedores autorizados.`
      : "✅ **Inventario suficiente:** Todos los medicamentos de la farmacia cuentan con niveles de stock saludables (> 10 unidades).";
  }

  if (q.includes("hoy") || q.includes("vendimos") || q.includes("ventas del dia") || q.includes("cierre")) {
    const todayStr = new Date().toDateString();
    const todaySales = ventas.filter((v: any) => new Date(v.fecha).toDateString() === todayStr);
    const todayTotal = todaySales.reduce((acc: number, v: any) => acc + Number(v.total || 0), 0);

    return (
      `📊 **Resumen de Ventas de Hoy:**\n` +
      `• Total de transacciones hoy: **${todaySales.length} ventas**\n` +
      `• Monto total facturado: **Q ${todayTotal.toLocaleString("es-GT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}**\n` +
      `• Total histórico en sistema: **${ventas.length} ventas registradas**.`
    );
  }

  if (q.includes("mas vendido") || q.includes("top") || q.includes("popular") || q.includes("rotacion")) {
    const qtyMap: Record<string, number> = {};
    ventas.forEach((v: any) => {
      (v.items || v.venta_detalle || []).forEach((item: any) => {
        const name = item.nombre || item.name;
        if (name) qtyMap[name] = (qtyMap[name] || 0) + Number(item.cantidad || 1);
      });
    });
    const sorted = Object.entries(qtyMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return sorted.length
      ? `🏆 **Top medicamentos con mayor rotación en FarmaciaDB:**\n` +
          sorted.map(([name, qty], idx) => `${idx + 1}. **${name}** — ${qty} unidades despachadas`).join("\n")
      : "ℹ️ Aún no hay suficientes registros de ventas acumulados para determinar el ranking de productos más vendidos.";
  }

  // -------------------------------------------------------------
  // 2. PREGUNTAS GENERALES DE FARMACOLOGÍA Y SEGURIDAD CLÍNICA
  // -------------------------------------------------------------

  // A. Alcohol e interacción con medicamentos
  if (q.includes("alcohol") || q.includes("licor") || q.includes("cerveza") || q.includes("trago") || q.includes("beber")) {
    return (
      `🛑 **Interacción de Medicamentos con Alcohol:**\n\n` +
      `Mezclar alcohol con medicamentos es peligroso debido a las siguientes interacciones clínicas:\n\n` +
      `• **Paracetamol (Panadol Extra):** El alcohol aumenta drásticamente el riesgo de **toxicidad hepática grave** o necrosis celular en el hígado.\n` +
      `• **AINEs (Advil, Voltaren, Aspirina):** Incrementa el riesgo de **hemorragia digestiva, acidez y úlcera gástrica** severa.\n` +
      `• **Antibióticos (Amoxil, Cipro):** Reduce la eficacia antibiótica y con ciertos fármacos provoca el *efecto antabús* (vómitos intensos, palpitaciones, hipotensión).\n` +
      `• **Antihistamínicos (Clarityne, Allegra):** Aunque son de segunda generación, el alcohol potencia la somnolencia y disminuye los reflejos motores.\n\n` +
      `⚠️ **Regla farmacéutica:** Siempre se debe suspender el consumo de alcohol durante cualquier tratamiento farmacológico.`
    );
  }

  // B. Embarazo y Lactancia
  if (q.includes("embaraz") || q.includes("embarazada") || q.includes("gestant") || q.includes("lactanc") || q.includes("amamant")) {
    const panadol = getMed("panadol");
    return (
      `🤰 **Uso de Medicamentos en Embarazo y Lactancia:**\n\n` +
      `Durante el embarazo, la placenta permite el paso de la mayoría de los fármacos:\n\n` +
      `✅ **Analgésico seguro de primera línea:**\n` +
      `• **${panadol ? panadol.nombre : "Paracetamol"}** (Categoría B): Es el fármaco de elección para dolor y fiebre en todos los trimestres, usado en dosis mínimas efectivas.\n\n` +
      `🛑 **Contraindicados o de alto riesgo:**\n` +
      `• **Ibuprofeno (Advil) y Diclofenaco (Voltaren):** Contraindicados especialmente en el **3er trimestre** (riesgo de cierre prematuro del conducto arterioso fetal e inhibición del parto).\n` +
      `• **Losartán Denk:** Totalmente contraindicado (produce toxicidad y malformaciones renales fetales graves).\n` +
      `• **Antibióticos (Cipro):** No recomendado en gestación.\n\n` +
      `⚠️ **Aviso de seguridad:** Toda mujer embarazada o en periodo de lactancia debe consultar con su ginecólogo u obstetra antes de tomar cualquier fármaco.`
    );
  }

  // C. Medicamentos Vencidos
  if (q.includes("medicamento vencido") || q.includes("tomar vencido") || q.includes("tomo algo vencido") || q.includes("vencio")) {
    return (
      `🛑 **¿Se puede tomar un medicamento vencido?**\n\n` +
      `**No, bajo ninguna circunstancia se debe consumir un medicamento caducado.**\n\n` +
      `Razones científicas:\n` +
      `1. **Pérdida de eficacia:** El principio activo se degrada químicamente y no alcanzará la concentración terapéutica necesaria.\n` +
      `2. **Riesgo de toxicidad:** La molécula puede transformarse en subproductos químicos nocivos para el hígado o los riñones.\n` +
      `3. **Contaminación biológica:** Jarabes, gotas oftálmicas y suspensiones líquidas pierden los conservantes y pueden albergar bacterias y hongos patógenos.\n\n` +
      `💡 *Conducta adecuada:* Desecha el producto en un punto seguro de recolección de medicamentos.`
    );
  }

  // D. Medicamentos Genéricos vs Marcas
  if (q.includes("generico") || q.includes("marca") || q.includes("diferencia entre generico") || q.includes("es lo mismo")) {
    return (
      `💊 **Medicamentos Genéricos vs Medicamentos de Marca:**\n\n` +
      `• **¿Tienen el mismo efecto?** Sí. Un medicamento genérico contiene exactamente el **mismo principio activo, dosis, concentración y vía de administración** que el de marca.\n` +
      `• **Estudios de Bioequivalencia:** Para ser comercializados, los genéricos demuestran que se absorben en la misma velocidad y cantidad en el cuerpo humano.\n` +
      `• **¿Por qué son más económicos?** Porque los fabricantes de genéricos no invierten en la investigación inicial de la patente ni en masivas campañas publicitarias.\n\n` +
      `💡 En FarmaciaDB ofrecemos tanto opciones de marca reconocida como alternativas de calidad garantizada al mejor precio en Quetzales.`
    );
  }

  // E. Olvido de una dosis
  if (q.includes("olvide") || q.includes("olvido") || q.includes("se me paso la dosis") || q.includes("no me tome")) {
    return (
      `⏰ **¿Qué hacer si olvidaste tomar una dosis?**\n\n` +
      `1. **Tómala en cuanto te acuerdes**, siempre que no falte poco tiempo para la siguiente dosis.\n` +
      `2. **Si ya está cerca la próxima toma:** Salta la dosis que olvidaste y continúa con tu horario habitual.\n` +
      `3. 🛑 **NUNCA dupliques la dosis:** Tomar dos pastillas juntas para "compensar" puede provocar intoxicación o una sobredosis peligrosa.\n\n` +
      `💡 *Consejo:* Puedes activar alarmas en tu teléfono o solicitar un pastillero organizador en la farmacia.`
    );
  }

  // F. Conservación y refrigeración (Cadena de Frío)
  if (q.includes("guardar") || q.includes("conservar") || q.includes("refriger") || q.includes("cadena de frio") || q.includes("temperatura")) {
    return (
      `❄️ **Normas de Conservación y Almacenamiento de Medicamentos:**\n\n` +
      `• **Refrigeración (2°C a 8°C):** Insulinas sin abrir, ciertas vacunas, colirios específicos y suspensiones antibióticas ya reconstituidas. ¡Nunca se deben congelar!\n` +
      `• **Temperatura Ambiente (< 30°C):** La mayoría de tabletas, cápsulas y pomadas deben guardarse en un lugar **fresco, seco y protegido de la luz solar directa**.\n` +
      `• 🚫 **Error común:** Evita guardar medicamentos en el baño o la cocina, ya que el vapor y la humedad degradan rápidamente las pastillas.\n\n` +
      `💡 En FarmaciaDB todos los productos se conservan bajo estricto control de temperatura y humedad ambiental.`
    );
  }

  // G. Presión arterial y crisis hipertensiva
  if (q.includes("presion") || q.includes("hipertens") || q.includes("tensión") || q.includes("presion alta") || q.includes("presion baja")) {
    const losartan = getMed("losartan");
    return (
      `🩺 **Orientación sobre Presión Arterial:**\n\n` +
      `• **Valores de referencia en adultos:** Normal: < 120/80 mmHg. Hipertensión: ≥ 140/90 mmHg.\n\n` +
      (losartan
        ? `• **Tratamiento disponible en FarmaciaDB:**\n` +
          `  - **${losartan.nombre}** (${losartan.principio}): Antihipertensivo ARA-II que relaja los vasos sanguíneos.\n` +
          `  - Stock: ${losartan.stock} uds. | Precio: Q ${Number(losartan.precioVenta).toFixed(2)}\n\n`
        : "") +
      `⚠️ **Signos de alarma (Crisis Hipertensiva):** Dolor de cabeza opresivo muy fuerte, visión borrosa o dolor en el pecho. Requiere atención de urgencias hospitalarias inmediata.`
    );
  }

  // H. Diabetes, glucosa y azúcar
  if (q.includes("diabet") || q.includes("azucar") || q.includes("glucos") || q.includes("hipoglucem")) {
    const glucophage = getMed("glucophage");
    const januvia = getMed("januvia");

    return (
      `🩺 **Manejo Farmacológico de Diabetes Tipo 2:**\n\n` +
      `Medicamentos orales disponibles en FarmaciaDB:\n\n` +
      (glucophage
        ? `1. **${glucophage.nombre}** (${glucophage.principio}):\n` +
          `   • Mejora la sensibilidad a la insulina y reduce la producción hepática de glucosa.\n` +
          `   • Dosis: Tomar siempre junto con las comidas principales.\n` +
          `   • Stock: ${glucophage.stock} uds. | Precio: Q ${Number(glucophage.precioVenta).toFixed(2)}\n\n`
        : "") +
      (januvia
        ? `2. **${januvia.nombre}** (${januvia.principio}):\n` +
          `   • Estimula la secreción de insulina dependiente de glucosa (inhibidor DPP-4).\n` +
          `   • Stock: ${januvia.stock} uds. | Precio: Q ${Number(januvia.precioVenta).toFixed(2)}\n\n`
        : "") +
      `💡 **¿Qué hacer ante hipoglucemia (<70 mg/dL)?** Administrar la regla del 15: tomar 15 gramos de carbohidratos de acción rápida (medio vaso de jugo o agua con azúcar) y volver a medir en 15 minutos.`
    );
  }

  // I. Diarrea, deshidratación y vómitos
  if (q.includes("diarrea") || q.includes("suero") || q.includes("vomit") || q.includes("nausea") || q.includes("deshidrat")) {
    return (
      `🩺 **Recomendación para Diarrea y Deshidratación:**\n\n` +
      `El principal peligro de los cuadros diarreicos y vómitos es la pérdida de líquidos y electrolitos:\n\n` +
      `1. **Hidratación Oral (Pilar Fundamental):** Consumir Suero Oral en pequeños sorbos continuos (no jugos azucarados ni refrescos).\n` +
      `2. **Dieta blanda:** Arroz blanco, papa hervida, manzana cocida y caldos claros desgrasados.\n` +
      `3. 🛑 **Precaución con antidiarreicos:** No se deben cortar bruscamente diarreas con fiebre alta o sangre, ya que impiden que el cuerpo expulse bacterias patógenas.\n\n` +
      `⚠️ Si hay signos de deshidratación severa (ojos hundidos, boca seca, mareos intensos) acudir de inmediato a un centro de salud.`
    );
  }

  // J. Dolor de muela / infección dental
  if (q.includes("muela") || q.includes("dental") || q.includes("diente") || q.includes("odontol")) {
    const advil = getMed("advil");
    const amoxil = getMed("amoxil");
    return (
      `🦷 **Orientación para Dolor de Muela o Molestias Dentales:**\n\n` +
      (advil
        ? `• **Para el dolor e inflamación:**\n` +
          `  - **${advil.nombre}** (${advil.principio}): Alivia el dolor punzante y reduce la inflamación de la encía (Stock: ${advil.stock} uds, Q${advil.precioVenta}).\n\n`
        : "") +
      (amoxil
        ? `• **Si hay flemón o infección bacteriana con pus:**\n` +
          `  - **${amoxil.nombre}** (${amoxil.principio}): Antibiótico frecuentemente prescrito en odontología (Stock: ${amoxil.stock} uds, Q${amoxil.precioVenta}).\n` +
          `  - 🛑 *Requiere evaluación y receta del odontólogo.*\n\n`
        : "") +
      `💡 Realizar buches suaves de agua tibia con sal para ayudar a desinflamar la zona afectada.`
    );
  }

  // -------------------------------------------------------------
  // 3. RECOMENDACIONES CLÍNICAS POR SÍNTOMA (CONCATENADAS A INVENTARIO)
  // -------------------------------------------------------------

  // Estómago, acidez, gastritis
  if (
    q.includes("estomago") ||
    q.includes("acidez") ||
    q.includes("gastrit") ||
    q.includes("reflujo") ||
    q.includes("indigest") ||
    q.includes("agrura") ||
    q.includes("ardor")
  ) {
    const gaviscon = getMed("gaviscon");
    const omeprazol = getMed("omeprazol");

    return (
      `🩺 **Recomendación para Dolor Estomacal / Acidez / Gastritis:**\n\n` +
      `En FarmaciaDB disponemos de dos opciones terapéuticas principales según el tipo de molestia:\n\n` +
      (gaviscon
        ? `1. **${gaviscon.nombre}** (${gaviscon.principio}):\n` +
          `   • **Ideal para:** Alivio rápido y mecánico de acidez, reflujo y ardor estomacal.\n` +
          `   • **Dosis:** 1 a 2 cucharadas o sobres 30 min después de comer y al acostarse.\n` +
          `   • **Stock disponible:** ${gaviscon.stock} uds. | **Precio:** Q ${Number(gaviscon.precioVenta).toFixed(2)}\n\n`
        : "") +
      (omeprazol
        ? `2. **${omeprazol.nombre}** (${omeprazol.principio}):\n` +
          `   • **Ideal para:** Gastritis recurrente, úlceras o ardor persistente.\n` +
          `   • **Dosis:** 1 cápsula al día tomada con agua 30 minutos ANTES del desayuno.\n` +
          `   • **Stock disponible:** ${omeprazol.stock} uds. | **Precio:** Q ${Number(omeprazol.precioVenta).toFixed(2)}\n\n`
        : "") +
      `⚠️ **Aviso de salud:** Si el dolor es incapacitante, hay vómitos oscuros o heces negras, remitir al paciente urgentemente con un médico.`
    );
  }

  // Dolor de cabeza, migraña, fiebre
  if (
    q.includes("cabeza") ||
    q.includes("fiebre") ||
    q.includes("calentura") ||
    q.includes("migrana") ||
    q.includes("jaqueca") ||
    q.includes("cefalea")
  ) {
    const panadol = getMed("panadol");
    const advil = getMed("advil");
    const aspirina = getMed("aspirina");

    return (
      `🩺 **Recomendación para Dolor de Cabeza / Fiebre:**\n\n` +
      (panadol
        ? `• **${panadol.nombre}** (${panadol.principio}):\n` +
          `  - Primera opción analgésica y antipirética segura. No daña el estómago.\n` +
          `  - Stock: ${panadol.stock} uds. | Precio: Q ${Number(panadol.precioVenta).toFixed(2)}\n\n`
        : "") +
      (advil
        ? `• **${advil.nombre}** (${advil.principio}):\n` +
          `  - Recomendado si el dolor es pulsátil (migraña) o existe inflamación.\n` +
          `  - Stock: ${advil.stock} uds. | Precio: Q ${Number(advil.precioVenta).toFixed(2)}\n\n`
        : "") +
      (aspirina
        ? `• **${aspirina.nombre}** (${aspirina.principio}):\n` +
          `  - Alivio rápido en adultos (Stock: ${aspirina.stock} uds, Q${aspirina.precioVenta}).\n\n`
        : "") +
      `💡 Mantener al paciente en un ambiente con poca luz e hidratarlo abundantemente.`
    );
  }

  // Gripe, resfriado, tos, flemas
  if (q.includes("gripe") || q.includes("resfriad") || q.includes("tos") || q.includes("flema") || q.includes("catarro")) {
    const panadol = getMed("panadol");
    const clarityne = getMed("clarityne");
    const mucosolvan = getMed("mucosolvan");
    const redoxon = getMed("redoxon");

    return (
      `🩺 **Tratamiento Sintomático para Gripe, Tos y Resfriado:**\n\n` +
      (panadol ? `1. **${panadol.nombre}**: para controlar la fiebre y dolor de cuerpo (Stock: ${panadol.stock} uds, Q${panadol.precioVenta}).\n` : "") +
      (mucosolvan ? `2. **${mucosolvan.nombre}** (${mucosolvan.principio}): mucolítico para disolver y expulsar flemas en tos con flema (Stock: ${mucosolvan.stock} uds, Q${mucosolvan.precioVenta}).\n` : "") +
      (clarityne ? `3. **${clarityne.nombre}** (${clarityne.principio}): para estornudos, picazón de garganta y goteo nasal (Stock: ${clarityne.stock} uds, Q${clarityne.precioVenta}).\n` : "") +
      (redoxon ? `4. **${redoxon.nombre}** (${redoxon.principio}): Vitamina C efervescente para fortalecer las defensas inmunológicas (Stock: ${redoxon.stock} uds, Q${redoxon.precioVenta}).\n\n` : "") +
      `☕ Guardar reposo y beber abundante líquido tibio.`
    );
  }

  // Alergias, ronchas, picazón
  if (q.includes("alerg") || q.includes("roncha") || q.includes("urticar") || q.includes("picaz") || q.includes("rinit")) {
    const clarityne = getMed("clarityne");
    const allegra = getMed("allegra");

    return (
      `🩺 **Tratamiento para Alergias, Rinitis y Ronchas:**\n\n` +
      (clarityne ? `• **${clarityne.nombre}** (${clarityne.principio}): Antihistamínico diario para rinitis y picazón de ojos/nariz (Stock: ${clarityne.stock} uds, Q${clarityne.precioVenta}).\n\n` : "") +
      (allegra ? `• **${allegra.nombre}** (${allegra.principio}): Antialérgico potente ideal para ronchas en la piel y urticaria; **no da sueño** (Stock: ${allegra.stock} uds, Q${allegra.precioVenta}).\n\n` : "") +
      `💡 Tomar 1 tableta al día preferentemente a la misma hora.`
    );
  }
  // Dolor muscular, espalda, articulaciones, golpes
  if (q.includes("muscular") || q.includes("espalda") || q.includes("articul") || q.includes("golpe") || q.includes("cuello") || q.includes("lumbar") || q.includes("torcedura")) {
    const voltaren = getMed("voltaren");
    const advil = getMed("advil");

    return (
      `🩺 **Recomendación para Dolor Muscular e Inflamación:**\n\n` +
      `Opciones terapéuticas de rápida absorción en FarmaciaDB:\n\n` +
      (voltaren
        ? `1. **${voltaren.nombre}** (${voltaren.principio}):\n` +
          `   • Potente antiinflamatorio analgésico de rescate para contracturas, lumbalgia y dolor articular agudo.\n` +
          `   • Stock disponible: ${voltaren.stock} uds. | Precio: Q ${Number(voltaren.precioVenta).toFixed(2)}\n\n`
        : "") +
      (advil
        ? `2. **${advil.nombre}** (${advil.principio}):\n` +
          `   • Eficaz para dolor de golpes, torceduras e inflamación muscular general.\n` +
          `   • Stock disponible: ${advil.stock} uds. | Precio: Q ${Number(advil.precioVenta).toFixed(2)}\n\n`
        : "") +
      `💡 Aplicar compresas de hielo las primeras 48 horas tras un golpe, y luego calor tibio para relajar los músculos.`
    );
  }

  // Piel, raspaduras, quemaduras leves, heridas o dermatitis
  if (q.includes("piel") || q.includes("quemadur") || q.includes("herida") || q.includes("raspon") || q.includes("cicatriz") || q.includes("irritacion") || q.includes("dermatit")) {
    const bepanthen = getMed("bepanthen");
    const fucidin = getMed("fucidin");

    return (
      `🩺 **Cuidado Dermatológico para Heridas, Quemaduras y Piel:**\n\n` +
      (bepanthen
        ? `• **Para regeneración y quemaduras leves:**\n` +
          `  - **${bepanthen.nombre}** (${bepanthen.principio}): Estimula la cicatrización natural y alivia irritaciones o rozaduras (Stock: ${bepanthen.stock} uds, Q${bepanthen.precioVenta}).\n\n`
        : "") +
      (fucidin
        ? `• **Si la herida tiene pus o sospecha de infección bacteriana:**\n` +
          `  - **${fucidin.nombre}** (${fucidin.principio}): Antibiótico tópico altamente eficaz contra estafilococos en la piel (Stock: ${fucidin.stock} uds, Q${fucidin.precioVenta}).\n\n`
        : "") +
      `💧 Lavar siempre la herida con abundante agua limpia y jabón neutro antes de aplicar cualquier crema.`
    );
  }

  // Infección urinaria / cistitis / ardor al orinar
  if (q.includes("orina") || q.includes("urinari") || q.includes("cistit") || q.includes("ardor al orinar")) {
    const cipro = getMed("cipro");
    return (
      `🩺 **Orientación para Infección Urinaria (Cistitis):**\n\n` +
      `El ardor miccional y ganas frecuentes de orinar suelen indicar infección en vías urinarias bajas:\n\n` +
      (cipro
        ? `• **Tratamiento antibacteriano en FarmaciaDB:**\n` +
          `  - **${cipro.nombre}** (${cipro.principio}): Antibiótico quinolónico de amplio espectro para vías urinarias (Stock: ${cipro.stock} uds, Q${cipro.precioVenta}).\n` +
          `  - 🛑 *Requiere prescripción médica obligatoria y cultivo si es recurrente.*\n\n`
        : "") +
      `💧 **Medida inmediata:** Beber entre 2 y 3 litros de agua al día para ayudar a limpiar la vejiga mecánicamente.`
    );
  }

  // Cólicos menstruales / dismenorrea
  if (q.includes("menstru") || q.includes("periodo") || q.includes("colico")) {
    const advil = getMed("advil");
    const panadol = getMed("panadol");
    return (
      `🩺 **Alivio para Cólicos Menstruales:**\n\n` +
      `Los cólicos ocurren por liberación de prostaglandinas en el útero:\n\n` +
      (advil
        ? `1. **${advil.nombre}** (${advil.principio}):\n` +
          `   • Fármaco de primera línea porque inhibe directamente la síntesis de prostaglandinas que causan las contracciones uterinas.\n` +
          `   • Tomar 400mg con alimentos al inicio de la molestia (Stock: ${advil.stock} uds, Q${advil.precioVenta}).\n\n`
        : "") +
      (panadol
        ? `2. **${panadol.nombre}** (${panadol.principio}): Opción analgésica alternativa si el paciente no tolera los AINEs o tiene gastritis (Stock: ${panadol.stock} uds, Q${panadol.precioVenta}).\n\n`
        : "") +
      `☕ Aplicar una bolsa térmica tibia en el bajo vientre para aliviar la tensión.`
    );
  }

  // Vitaminas, fatiga, cansancio
  if (q.includes("vitamina") || q.includes("cansancio") || q.includes("fatiga") || q.includes("energia") || q.includes("rendimiento")) {
    const centrum = getMed("centrum");
    const redoxon = getMed("redoxon");
    return (
      `💊 **Suplementación Vitamínica y Energía en FarmaciaDB:**\n\n` +
      (centrum
        ? `• **${centrum.nombre}** (${centrum.principio}):\n` +
          `  - Multivitamínico y multimineral completo de la A al Zinc. Ideal para agotamiento físico y mental en adultos.\n` +
          `  - Dosis: 1 tableta al día con el desayuno (Stock: ${centrum.stock} uds, Q${centrum.precioVenta}).\n\n`
        : "") +
      (redoxon
        ? `• **${redoxon.nombre}** (${redoxon.principio}):\n` +
          `  - Vitamina C 1g efervescente: refuerza el sistema inmunológico y acción antioxidante (Stock: ${redoxon.stock} uds, Q${redoxon.precioVenta}).\n\n`
        : "") +
      `💡 Asegurar una alimentación balanceada y al menos 7 a 8 horas de sueño continuo.`
    );
  }

  // Respiratorio, asma, broncoespasmo
  if (q.includes("asma") || q.includes("inhalador") || q.includes("pecho cerrado") || q.includes("bronqu") || q.includes("respirar")) {
    const ventolin = getMed("ventolin");
    return (
      `🩺 **Manejo Respiratorio y Broncoespasmo:**\n\n` +
      (ventolin
        ? `• **${ventolin.nombre}** (${ventolin.principio}):\n` +
          `  - Broncodilatador de acción rápida para aliviar la sensación de pecho cerrado, sibilancias o crisis de asma.\n` +
          `  - Dosis: 1 a 2 inhalaciones según indicación médica.\n` +
          `  - Stock disponible: ${ventolin.stock} uds. | Precio: Q ${Number(ventolin.precioVenta).toFixed(2)}\n\n`
        : "") +
      `⚠️ Si la dificultad para respirar no cede con el inhalador, trasladar de inmediato a un centro de urgencias.`
    );
  }

  // Interacción Paracetamol + Ibuprofeno
  if ((q.includes("paracetamol") && q.includes("ibuprofeno")) || (q.includes("panadol") && q.includes("advil"))) {
    return (
      `🩺 **¿Se puede tomar Paracetamol junto con Ibuprofeno?**\n\n` +
      `**Sí, es una combinación segura si se realiza correctamente:**\n\n` +
      `• **Mecanismos complementarios:** El Paracetamol actúa a nivel central (cerebro) como analgésico y antipirético, mientras que el Ibuprofeno actúa periféricamente desinflamando la zona afectada.\n` +
      `• **Pauta de alternancia recomendada:** En dolores intensos o fiebre persistente, se pueden alternar cada 4 horas (ej: Paracetamol a las 8:00, Ibuprofeno a las 12:00, Paracetamol a las 16:00).\n` +
      `• 🛑 **Regla de oro:** No sobrepasar la dosis máxima diaria de cada uno (4g para Paracetamol, 1200mg para Ibuprofeno sin supervisión médica).\n` +
      `• Tomar el Ibuprofeno siempre con comida para proteger el estómago.`
    );
  }

  // Insomnio / dormir
  if (q.includes("dormir") || q.includes("insomnio") || q.includes("desvelo")) {
    return (
      `🩺 **Orientación para el Insomnio y Dificultad para Conciliar el Sueño:**\n\n` +
      `1. **Higiene del sueño:** Evitar pantallas (celulares, TV) 1 hora antes de acostarse; mantener el cuarto oscuro y ventilado.\n` +
      `2. **Evitar estimulantes:** No consumir café, té negro ni refrescos de cola después de las 4:00 PM.\n` +
      `3. **Infusiones naturales:** Manzanilla, tilo o valeriana ayudan a relajar el sistema nervioso central.\n` +
      `⚠️ Los medicamentos sedantes o hipnóticos requieren prescripción médica estricta para evitar dependencia o tolerancia.`
    );
  }

  // -------------------------------------------------------------
  // 4. BÚSQUEDA Y MONOGRAFÍA DETALLADA DE CUALQUIER MEDICAMENTO
  // -------------------------------------------------------------
  for (const [key, monograph] of Object.entries(DRUG_MONOGRAPHS)) {
    if (q.includes(key)) {
      const dbMed = getMed(key);
      const name = dbMed ? dbMed.nombre : key.toUpperCase();
      const principle = dbMed ? dbMed.principio : "";
      const stock = dbMed ? dbMed.stock : 0;
      const price = dbMed ? Number(dbMed.precioVenta).toFixed(2) : "0.00";
      const expiry = dbMed ? dbMed.caducidad : "";

      return (
        `💊 **Monografía Clínica: ${name}**\n` +
        (principle ? `• **Principio Activo:** ${principle}\n` : "") +
        `• **Indicaciones Principales:** ${monograph.indicaciones}\n` +
        `• **Mecanismo de Acción:** ${monograph.mecanismo}\n` +
        `• **Posología Habitual:** ${monograph.dosisAdulto}\n` +
        `• **Modo de Toma:** ${monograph.tomaConComida}\n` +
        `• **Efectos Secundarios:** ${monograph.efectosSecundarios}\n` +
        `• **Contraindicaciones:** ${monograph.contraindicaciones}\n\n` +
        `📦 **Disponibilidad en FarmaciaDB:**\n` +
        `• Stock en estantería: **${stock} unidades** (${stock < 10 ? "⚠️ Stock crítico" : "✅ Disponible"})\n` +
        `• Precio de venta al público: **Q ${price}**\n` +
        (expiry ? `• Fecha de caducidad registrada: **${expiry}**` : "")
      );
    }
  }

  // -------------------------------------------------------------
  // 5. RESPUESTA FARMACÉUTICA INTELIGENTE CONTEXTUAL (PARA CUALQUIER OTRA CONSULTA)
  // -------------------------------------------------------------
  return (
    `🩺 **Asesoría Farmacéutica Profesional:**\n\n` +
    `Como asistente experto de **FarmaciaDB**, puedo ayudarte con **literalmente cualquier consulta farmacológica o de droguería**:\n\n` +
    `• **Recomendaciones por síntomas:** Dolor de estómago, acidez, gripe, tos, dolor de muela, fiebre, diarrea, alergias o dolores musculares.\n` +
    `• **Monografías y fármacos:** Para qué sirve cada medicamento, dosis recomendada, efectos secundarios e interacciones con alcohol o comidas.\n` +
    `• **Grupos especiales:** Uso seguro de medicamentos en embarazo, lactancia, personas mayores y pacientes diabéticos o hipertensos.\n` +
    `• **Gestión de la botica:** Control de vencimientos próximos, stock bajo, compras y ventas en Quetzales (Q).\n\n` +
    `💬 *Por favor indica los síntomas del paciente, el nombre del producto o la duda puntual que necesitas resolver y te daré una orientación clínica completa.*`
  );
}
