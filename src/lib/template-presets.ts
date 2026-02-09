export type TemplatePreset = {
  name: string;
  code: string;
  title: string;
  notes?: string;
  items: Array<{
    groupName?: string;
    paramName: string;
    unit?: string;
    refRangeText?: string;
    refMin?: number;
    refMax?: number;
    valueType: "NUMBER" | "TEXT" | "SELECT";
    selectOptions?: string[];
    order: number;
  }>;
};

export const templatePresets: TemplatePreset[] = [
  {
    name: "Hemograma Completo",
    code: "HEMO",
    title: "Hemograma Completo",
    notes: "Análisis completo de células sanguíneas",
    items: [
      { groupName: "Serie Roja", paramName: "Hemoglobina", unit: "g/dL", refRangeText: "12-16", refMin: 12, refMax: 16, valueType: "NUMBER", order: 1 },
      { groupName: "Serie Roja", paramName: "Hematocrito", unit: "%", refRangeText: "36-48", refMin: 36, refMax: 48, valueType: "NUMBER", order: 2 },
      { groupName: "Serie Roja", paramName: "Eritrocitos", unit: "millones/μL", refRangeText: "4.2-5.4", refMin: 4.2, refMax: 5.4, valueType: "NUMBER", order: 3 },
      { groupName: "Serie Blanca", paramName: "Leucocitos", unit: "/μL", refRangeText: "4000-11000", refMin: 4000, refMax: 11000, valueType: "NUMBER", order: 4 },
      { groupName: "Serie Blanca", paramName: "Neutrófilos", unit: "%", refRangeText: "50-70", refMin: 50, refMax: 70, valueType: "NUMBER", order: 5 },
      { groupName: "Serie Blanca", paramName: "Linfocitos", unit: "%", refRangeText: "20-40", refMin: 20, refMax: 40, valueType: "NUMBER", order: 6 },
      { groupName: "Serie Blanca", paramName: "Monocitos", unit: "%", refRangeText: "2-8", refMin: 2, refMax: 8, valueType: "NUMBER", order: 7 },
      { groupName: "Plaquetas", paramName: "Plaquetas", unit: "/μL", refRangeText: "150000-450000", refMin: 150000, refMax: 450000, valueType: "NUMBER", order: 8 },
    ],
  },
  {
    name: "Prueba de Embarazo Cualitativa",
    code: "EMBAR",
    title: "Prueba de Embarazo Cualitativa",
    notes: "Detección de hormona gonadotropina coriónica humana (HCG)",
    items: [
      { paramName: "Prueba de Embarazo", unit: "", refRangeText: "", valueType: "SELECT", selectOptions: ["Positivo", "Negativo", "Débilmente Positivo"], order: 1 },
    ],
  },
  {
    name: "Examen de Orina Completo",
    code: "ORINA",
    title: "Examen de Orina Completo",
    notes: "Análisis físico, químico y microscópico de orina",
    items: [
      { groupName: "Físico", paramName: "Color", unit: "", refRangeText: "Amarillo claro", valueType: "TEXT", order: 1 },
      { groupName: "Físico", paramName: "Aspecto", unit: "", refRangeText: "Límpido", valueType: "SELECT", selectOptions: ["Límpido", "Turbio", "Opaco"], order: 2 },
      { groupName: "Químico", paramName: "pH", unit: "", refRangeText: "5.0-8.0", refMin: 5.0, refMax: 8.0, valueType: "NUMBER", order: 3 },
      { groupName: "Químico", paramName: "Densidad", unit: "", refRangeText: "1.005-1.030", refMin: 1.005, refMax: 1.030, valueType: "NUMBER", order: 4 },
      { groupName: "Químico", paramName: "Proteínas", unit: "mg/dL", refRangeText: "Negativo", valueType: "SELECT", selectOptions: ["Negativo", "Traza", "+", "++", "+++"], order: 5 },
      { groupName: "Químico", paramName: "Glucosa", unit: "mg/dL", refRangeText: "Negativo", valueType: "SELECT", selectOptions: ["Negativo", "Traza", "+", "++", "+++"], order: 6 },
      { groupName: "Microscópico", paramName: "Leucocitos", unit: "/campo", refRangeText: "0-5", refMin: 0, refMax: 5, valueType: "NUMBER", order: 7 },
      { groupName: "Microscópico", paramName: "Eritrocitos", unit: "/campo", refRangeText: "0-3", refMin: 0, refMax: 3, valueType: "NUMBER", order: 8 },
    ],
  },
  {
    name: "Perfil Lipídico",
    code: "LIPID",
    title: "Perfil Lipídico",
    notes: "Análisis de lípidos en sangre",
    items: [
      { paramName: "Colesterol Total", unit: "mg/dL", refRangeText: "<200", refMax: 200, valueType: "NUMBER", order: 1 },
      { paramName: "HDL Colesterol", unit: "mg/dL", refRangeText: ">40", refMin: 40, valueType: "NUMBER", order: 2 },
      { paramName: "LDL Colesterol", unit: "mg/dL", refRangeText: "<100", refMax: 100, valueType: "NUMBER", order: 3 },
      { paramName: "Triglicéridos", unit: "mg/dL", refRangeText: "<150", refMax: 150, valueType: "NUMBER", order: 4 },
    ],
  },
  {
    name: "Función Renal",
    code: "RENAL",
    title: "Función Renal",
    notes: "Evaluación de la función renal",
    items: [
      { paramName: "Urea", unit: "mg/dL", refRangeText: "13-50", refMin: 13, refMax: 50, valueType: "NUMBER", order: 1 },
      { paramName: "Creatinina", unit: "mg/dL", refRangeText: "Hombres: 0.7-1.4, Mujeres: 0.6-1.2", refMin: 0.6, refMax: 1.4, valueType: "NUMBER", order: 2 },
      { paramName: "Ácido Úrico", unit: "mg/dL", refRangeText: "Hombres: 3.5-7.2, Mujeres: 2.6-6.0", refMin: 2.6, refMax: 7.2, valueType: "NUMBER", order: 3 },
    ],
  },
  {
    name: "Glucosa en Ayunas",
    code: "GLUC",
    title: "Glucosa en Ayunas",
    notes: "Ayuno de 8 horas recomendado",
    items: [
      { paramName: "Glucosa", unit: "mg/dL", refRangeText: "70-110", refMin: 70, refMax: 110, valueType: "NUMBER", order: 1 },
    ],
  },
];
