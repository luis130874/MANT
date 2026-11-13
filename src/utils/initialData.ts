/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cliente, Sistema, FrecuenciaConfig, Tecnico, Equipo, RegistroHistorialMP, OrdenCorrectivo, OrdenTrabajoOT, OrdenCalibracion, Instrumento, Repuesto, MovimientoRepuesto } from '../types';

export const INITIAL_CLIENTES: Cliente[] = [
  {
    codigo: 'CLI-01',
    nombre: 'TermoIndustrial del Sur S.A.',
    rut: '76.452.190-8',
    direccion: 'Parque Industrial Las Américas #450, Módulo B',
    telefono: '+56 2 2840 9200',
    correo: 'operaciones@termoindustrial.cl',
    logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70" width="240" height="70"><rect width="240" height="70" rx="8" fill="%230f172a"/><circle cx="36" cy="35" r="20" fill="%23f97316"/><path d="M36 21c4 6 10 11 10 17 0 5.5-4.5 10-10 10s-10-4.5-10-10c0-6 6-11 10-17z" fill="%23fbbf24"/><text x="68" y="32" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="900" fill="%23ffffff" letter-spacing="-0.5">TERMOINDUSTRIAL</text><text x="68" y="48" font-family="system-ui,-apple-system,sans-serif" font-size="10" font-weight="700" fill="%2338bdf8" letter-spacing="1.5">DEL SUR S.A.</text></svg>'
  },
  {
    codigo: 'CLI-02',
    nombre: 'Frigorífico Andino Austral',
    rut: '96.883.210-4',
    direccion: 'Ruta Panamericana Sur Km 48, Buin',
    telefono: '+56 2 2715 4400',
    correo: 'mantenimiento@andinoaustral.com',
    logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70" width="240" height="70"><rect width="240" height="70" rx="8" fill="%230c4a6e"/><circle cx="36" cy="35" r="20" fill="%230284c7"/><path d="M36 19v32M20 35h32M25 24l22 22M25 46l22-22" stroke="%23ffffff" stroke-width="2.5" stroke-linecap="round"/><text x="68" y="32" font-family="system-ui,-apple-system,sans-serif" font-size="13" font-weight="900" fill="%23ffffff" letter-spacing="-0.3">FRIGOR%C3%8DFICO ANDINO</text><text x="68" y="48" font-family="system-ui,-apple-system,sans-serif" font-size="10" font-weight="700" fill="%237dd3fc" letter-spacing="1.2">AUSTRAL S.A.</text></svg>'
  },
  {
    codigo: 'CLI-03',
    nombre: 'Manufacturas del Cobre Ltda.',
    rut: '81.992.300-1',
    direccion: 'Av. Maestranza #1240, San Bernardo',
    telefono: '+56 2 2580 1190',
    correo: 'planta@manufcobre.cl',
    logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70" width="240" height="70"><rect width="240" height="70" rx="8" fill="%23431407"/><circle cx="36" cy="35" r="20" fill="%23ea580c"/><rect x="26" y="25" width="20" height="20" rx="4" fill="%23fed7aa"/><text x="68" y="32" font-family="system-ui,-apple-system,sans-serif" font-size="13" font-weight="900" fill="%23ffffff" letter-spacing="-0.3">MANUFACTURAS</text><text x="68" y="48" font-family="system-ui,-apple-system,sans-serif" font-size="10" font-weight="700" fill="%23fdba74" letter-spacing="1.2">DEL COBRE LTDA.</text></svg>'
  }
];

export const INITIAL_SISTEMAS: Sistema[] = [
  {
    codigo_sis: 'SIS-HVAC',
    nombre: 'HVAC / Climatización & Chiller',
    descripcion: 'Sistemas de enfriamiento centralizado, torres de enfriamiento y tratamiento de aire'
  },
  {
    codigo_sis: 'SIS-VAPOR',
    nombre: 'Generación de Vapor & Calderas',
    descripcion: 'Calderas pirotubulares, ablandadores de agua, líneas de vapor y trampas'
  },
  {
    codigo_sis: 'SIS-NEUM',
    nombre: 'Aire Comprimido & Neumática',
    descripcion: 'Compresores de tornillo, secadores frigoríficos y red de aire industrial'
  },
  {
    codigo_sis: 'SIS-ELEC',
    nombre: 'Subestación & Red Eléctrica',
    descripcion: 'Transformadores de media tensión, celdas de distribución y tableros generales'
  },
  {
    codigo_sis: 'SIS-REF',
    nombre: 'Refrigeración Industrial Amoníaco',
    descripcion: 'Compresores reciprocantes, condensadores evaporativos y túneles de frío'
  },
  {
    codigo_sis: 'SIS-BOMB',
    nombre: 'Sistemas Hidráulicos & Bombeo',
    descripcion: 'Bombas centrífugas multietapa, presurizadores y redes contra incendios'
  }
];

export const INITIAL_FRECUENCIAS: FrecuenciaConfig[] = [
  { nombre_freq: 'Diaria', dias_tolerancia: 1, paso_meses: 0 },
  { nombre_freq: 'Semanal', dias_tolerancia: 1, paso_meses: 0 },
  { nombre_freq: 'Quincenal', dias_tolerancia: 2, paso_meses: 0 },
  { nombre_freq: 'Mensual', dias_tolerancia: 4, paso_meses: 1 },
  { nombre_freq: 'Bimestral', dias_tolerancia: 5, paso_meses: 2 },
  { nombre_freq: 'Trimestral', dias_tolerancia: 7, paso_meses: 3 },
  { nombre_freq: 'Semestral', dias_tolerancia: 15, paso_meses: 6 },
  { nombre_freq: 'Anual', dias_tolerancia: 30, paso_meses: 12 }
];

export const INITIAL_TECNICOS: Tecnico[] = [
  {
    codigo_tec: 'TEC-01',
    nombre: 'Ing. Carlos Mendoza',
    especialidad: 'Mecánica Térmica y Calderas',
    estado: 'Activo',
    telefono: '+56 9 8450 1122',
    correo: 'cmendoza@prodexus.net'
  },
  {
    codigo_tec: 'TEC-02',
    nombre: 'Téc. Roberto Valenzuela',
    especialidad: 'Electricidad y Automatización',
    estado: 'Activo',
    telefono: '+56 9 7331 9901',
    correo: 'rvalenzuela@prodexus.net'
  },
  {
    codigo_tec: 'TEC-03',
    nombre: 'Téc. Miguel Ángel Soto',
    especialidad: 'Refrigeración y Climatización HVAC',
    estado: 'Activo',
    telefono: '+56 9 6112 4433',
    correo: 'msoto@prodexus.net'
  },
  {
    codigo_tec: 'TEC-04',
    nombre: 'Téc. Fernando Morales',
    especialidad: 'Mecatrónica y Bombas Hidráulicas',
    estado: 'Activo',
    telefono: '+56 9 5540 8877',
    correo: 'fmorales@prodexus.net'
  }
];

export const INITIAL_EQUIPOS: Equipo[] = [
  {
    codigo_eq: 'CH-01',
    cliente: 'TermoIndustrial del Sur S.A.',
    nombre: 'Chiller Centrífugo Trane 350 TR',
    sistema: 'HVAC / Climatización & Chiller',
    marca: 'Trane',
    modelo: 'CVHE-350',
    frecuencia: 'Mensual',
    tareas: `Revisión de presiones de evaporador y condensador
Verificación del nivel y acidez de aceite sintético
Prueba de fugas de gas refrigerante R-134a con detector acústico
Inspección de contactores de fuerza y apriete de bornes
Purga de incondensables del sistema
Limpieza de filtros y verificación de flujo de agua helada`,
    tecnico: 'Téc. Miguel Ángel Soto',
    fecha_proxima: '2026-01-10',
    criticidad: 'Alta',
    ubicacion: 'Sala de Máquinas Piso 1'
  },
  {
    codigo_eq: 'CALD-01',
    cliente: 'TermoIndustrial del Sur S.A.',
    nombre: 'Caldera Pirotubular Cleaver Brooks 500 BHP',
    sistema: 'Generación de Vapor & Calderas',
    marca: 'Cleaver Brooks',
    modelo: 'CB-700-500',
    frecuencia: 'Mensual',
    tareas: `Purga de fondo de lodos y purga continua de superficie
Prueba funcional de válvulas de seguridad con disparo manual
Inspección y calibración de fotoresistencia / detector de llama
Análisis de gases de combustión (O2, CO, exceso de aire)
Revisión de electrodos y bujías de ignición
Verificación del corte por bajo nivel de agua McDonnell-Miller`,
    tecnico: 'Ing. Carlos Mendoza',
    fecha_proxima: '2026-01-15',
    criticidad: 'Alta',
    ubicacion: 'Sala de Calderas Central'
  },
  {
    codigo_eq: 'COMP-01',
    cliente: 'TermoIndustrial del Sur S.A.',
    nombre: 'Compresor Rotativo a Tornillo Atlas Copco 75 kW',
    sistema: 'Aire Comprimido & Neumática',
    marca: 'Atlas Copco',
    modelo: 'GA-75 VSD',
    frecuencia: 'Bimestral',
    tareas: `Inspección de temperatura de descarga del elemento compresor
Comprobación de caída de presión en filtro separador de aceite
Inspección de tensión de correas o acoplamiento elástico
Verificación de drenajes automáticos capacitivos Bekomat
Limpieza de radiador de post-enfriamiento con aire a presión
Toma de muestra de aceite para análisis espectrométrico`,
    tecnico: 'Téc. Fernando Morales',
    fecha_proxima: '2026-01-20',
    criticidad: 'Media',
    ubicacion: 'Caseta de Aire Comprimido'
  },
  {
    codigo_eq: 'SUB-01',
    cliente: 'TermoIndustrial del Sur S.A.',
    nombre: 'Transformador Principal de Potencia 1250 kVA',
    sistema: 'Subestación & Red Eléctrica',
    marca: 'Schneider Electric',
    modelo: 'Trihal Dry 1250/23kV',
    frecuencia: 'Trimestral',
    tareas: `Termografía infrarroja en bornes de media y baja tensión
Revisión y torque de conexiones principales con torquímetro
Inspección visual de aisladores y deshumidificador de sílica gel
Comprobación de disparos de relé Buchholz y temperatura PT100
Limpieza criogénica de polvo y partículas en devanados
Medición de resistencia de aislamiento (Megado 2.5 kV)`,
    tecnico: 'Téc. Roberto Valenzuela',
    fecha_proxima: '2026-01-25',
    criticidad: 'Alta',
    ubicacion: 'Patio Eléctrico Subestación 1'
  },
  {
    codigo_eq: 'BOMB-01',
    cliente: 'TermoIndustrial del Sur S.A.',
    nombre: 'Bomba Multietapa Alimentación Caldera Grundfos',
    sistema: 'Sistemas Hidráulicos & Bombeo',
    marca: 'Grundfos',
    modelo: 'CR-64-4-2',
    frecuencia: 'Mensual',
    tareas: `Medición de vibración mecánica en rodamientos (ISO 10816)
Inspección de sello mecánico y fuga por empaquetadura
Control de temperatura de rodamientos de motor y bomba
Verificación de alineación láser eje motor-bomba
Inspección de manómetros de succión y descarga
Engrase de rodamientos con grasa para alta temperatura`,
    tecnico: 'Téc. Fernando Morales',
    fecha_proxima: '2026-01-12',
    criticidad: 'Media',
    ubicacion: 'Plataforma de Desaireador'
  },
  {
    codigo_eq: 'REF-01',
    cliente: 'Frigorífico Andino Austral',
    nombre: 'Compresor de Amoníaco Mycom Mayekawa 8 Cilindros',
    sistema: 'Refrigeración Industrial Amoníaco',
    marca: 'Mayekawa Mycom',
    modelo: 'N8WA',
    frecuencia: 'Mensual',
    tareas: `Revisión de presión diferencial de bomba de lubricación
Inspección de fugas de NH3 mediante papel reactivo de fenolftaleína
Verificación de presostatos de alta, baja y aceite
Comprobación del juego axial y vibraciones
Reemplazo o lavado de filtros de succión de amoníaco
Control de consumo eléctrico por fase del motor de 150 HP`,
    tecnico: 'Téc. Miguel Ángel Soto',
    fecha_proxima: '2026-01-18',
    criticidad: 'Alta',
    ubicacion: 'Sala Frío Túnel 3'
  }
];

export const INITIAL_HISTORIAL: RegistroHistorialMP[] = [
  {
    id: 'h-1',
    codigo_eq: 'CH-01',
    mes_n: 1,
    fecha_real: '10/01/2026',
    id_ot: 'MP-2026-01-0001',
    comentarios: 'Mantenimiento ejecutado según protocolo. Presión de condensación óptima 145 psi. Filtros limpios.',
    tecnico: 'Téc. Miguel Ángel Soto',
    duracion_horas: 3.5,
    repuestos_utilizados: 'Filtro deshidratador D-48, sellos O-ring'
  },
  {
    id: 'h-2',
    codigo_eq: 'CALD-01',
    mes_n: 1,
    fecha_real: '16/01/2026',
    id_ot: 'MP-2026-01-0002',
    comentarios: 'Caldera calibrada con analizador Testo 350. Rendimiento de combustión 88.4%. Sin incrustaciones severas.',
    tecnico: 'Ing. Carlos Mendoza',
    duracion_horas: 4.0,
    repuestos_utilizados: 'Empaquetaduras de puerta manhole, boquilla de atomización'
  },
  {
    id: 'h-3',
    codigo_eq: 'BOMB-01',
    mes_n: 1,
    fecha_real: '12/01/2026',
    id_ot: 'MP-2026-01-0005',
    comentarios: 'Sello mecánico sin goteo. Vibraciones en 1.8 mm/s RMS (rango bueno). Rodamientos relubricados.',
    tecnico: 'Téc. Fernando Morales',
    duracion_horas: 2.0,
    repuestos_utilizados: 'Grasa sintética SKF LGHP 2'
  },
  {
    id: 'h-4',
    codigo_eq: 'CH-01',
    mes_n: 2,
    fecha_real: '11/02/2026',
    id_ot: 'MP-2026-02-0001',
    comentarios: 'Revisión mensual completada. Se detectó microfuga en presostato de alta corregida en el acto.',
    tecnico: 'Téc. Miguel Ángel Soto',
    duracion_horas: 3.0
  },
  {
    id: 'h-5',
    codigo_eq: 'CALD-01',
    mes_n: 2,
    fecha_real: '14/02/2026',
    id_ot: 'MP-2026-02-0002',
    comentarios: 'Prueba de disparo de válvulas de alivio exitosa a 150 PSI. Quemador opera suavemente.',
    tecnico: 'Ing. Carlos Mendoza',
    duracion_horas: 3.5
  }
];

export const INITIAL_CORRECTIVOS: OrdenCorrectivo[] = [
  {
    id_ot: 'MC-2026-02-0001',
    codigo_eq: 'COMP-01',
    cliente: 'TermoIndustrial del Sur S.A.',
    fecha_emision: '08/02/2026',
    falla_reportada: 'Alarma de alta temperatura de descarga (>105°C). Parada intempestiva por seguridad.',
    fecha_tentativa: '09/02/2026',
    dias_tolerancia: 2,
    estado: 'Cerrada (A tiempo)',
    fecha_real: '09/02/2026',
    acciones_realizadas: 'Desmontaje de válvula termostática de aceite atascada. Limpieza ultrasónica y reemplazo de elemento sensor de cera 71°C. Relleno de refrigerante R-404A en secador.',
    tecnico: 'Téc. Fernando Morales',
    repuestos_utilizados: 'Kit termostático Atlas Copco 2901-1616-00, 5L Roto-Inject Fluid',
    costo_estimado: 480,
    prioridad: 'Alta'
  },
  {
    id_ot: 'MC-2026-02-0002',
    codigo_eq: 'BOMB-01',
    cliente: 'TermoIndustrial del Sur S.A.',
    fecha_emision: '18/02/2026',
    falla_reportada: 'Fuga de agua a 85°C en el sello mecánico de la bomba de alimentación calderas.',
    fecha_tentativa: '20/02/2026',
    dias_tolerancia: 1,
    estado: 'Cerrada (A tiempo)',
    fecha_real: '20/02/2026',
    acciones_realizadas: 'Reemplazo del cartucho de sello mecánico de carburo de silicio / vitón. Verificación de excentricidad del eje dentro de 0.03mm.',
    tecnico: 'Téc. Fernando Morales',
    repuestos_utilizados: 'Sello mecánico tipo cartucho Grundfos HQQE 28mm',
    costo_estimado: 320,
    prioridad: 'Urgente'
  },
  {
    id_ot: 'MC-2026-03-0001',
    codigo_eq: 'CH-01',
    cliente: 'TermoIndustrial del Sur S.A.',
    fecha_emision: '02/03/2026',
    falla_reportada: 'Vibración anormal en ventilador de tiro forzado de torre de enfriamiento del Chiller.',
    fecha_tentativa: '05/03/2026',
    dias_tolerancia: 2,
    estado: 'Pendiente',
    fecha_real: '',
    acciones_realizadas: '',
    tecnico: 'Téc. Miguel Ángel Soto',
    prioridad: 'Alta'
  }
];

export const INITIAL_ORDENES_TRABAJO: OrdenTrabajoOT[] = [
  {
    id_ot: 'OT-2026-01-0001',
    codigo_eq: 'SUB-01',
    cliente: 'TermoIndustrial del Sur S.A.',
    fecha_emision: '05/01/2026',
    trabajo_solicitado: 'Instalación de analizador de redes eléctricas en tiempo real con protocolo Modbus TCP en tablero general.',
    fecha_tentativa: '22/01/2026',
    dias_tolerancia: 5,
    estado: 'Cerrada (A tiempo)',
    fecha_real: '21/01/2026',
    acciones_realizadas: 'Montaje en riel DIN de multímetro Schneider PM5350, canalización con tubería EMT 3/4", conexionado de 3 transformadores de corriente 1500/5A y puesta en marcha en red SCADA.',
    tecnico: 'Téc. Roberto Valenzuela',
    materiales_utilizados: 'Analizador PM5350, 3x TC 1500/5A, 15m cable apantallado Belden 9841',
    prioridad: 'Media'
  },
  {
    id_ot: 'OT-2026-02-0001',
    codigo_eq: 'CALD-01',
    cliente: 'TermoIndustrial del Sur S.A.',
    fecha_emision: '10/02/2026',
    trabajo_solicitado: 'Reemplazo preventivo de tramo de 12 metros de tubería de purga con vapor de alta presión y válvula globo de acero forjado.',
    fecha_tentativa: '28/02/2026',
    dias_tolerancia: 4,
    estado: 'Cerrada (A tiempo)',
    fecha_real: '27/02/2026',
    acciones_realizadas: 'Corte de tubería con amoladora, soldadura por arco con electrodo E7018 calificado, radiografiado de soldaduras y prueba hidrostática a 1.5x presión de diseño.',
    tecnico: 'Ing. Carlos Mendoza',
    materiales_utilizados: 'Cañería ASTM A106 Gr B Schedule 80 2", Válvula globo Bonney Forge 800#',
    prioridad: 'Alta'
  },
  {
    id_ot: 'OT-2026-03-0001',
    codigo_eq: 'COMP-01',
    cliente: 'TermoIndustrial del Sur S.A.',
    fecha_emision: '01/03/2026',
    trabajo_solicitado: 'Ampliación de línea de aire comprimido en aluminio ranurado para nueva envasadora en línea 3.',
    fecha_tentativa: '15/03/2026',
    dias_tolerancia: 3,
    estado: 'Pendiente',
    fecha_real: '',
    acciones_realizadas: '',
    tecnico: 'Téc. Fernando Morales',
    prioridad: 'Media'
  }
];

export const INITIAL_CALIBRACIONES: OrdenCalibracion[] = [
  {
    id_ot: 'CAL-2026-01-0001',
    codigo_eq: 'MAN-CH01',
    cliente: 'TermoIndustrial del Sur S.A.',
    instrumento_nombre: 'Manómetro Digital Presión Alta Chiller Trane',
    variable_medicion: 'Presión Hidráulica / Refrigerante',
    rango_operacion: '0 a 300 PSI',
    tolerancia_emp: '± 0.5% FS (± 1.5 PSI)',
    frecuencia_calibracion: 'Semestral',
    patron_utilizado: 'Balanza de Pesos Muertos Ametek PKII S/N 84120',
    trazabilidad_patron: 'CERT-MET-INT-2025-441 (Laboratorio Acreditado INN)',
    fecha_emision: '05/01/2026',
    fecha_programada: '15/01/2026',
    fecha_tentativa: '18/01/2026',
    dias_tolerancia: 7,
    estado: 'Conforme (A tiempo)',
    fecha_real: '15/01/2026',
    dictamen: 'Conforme',
    error_max_hallado: '+0.21% FS',
    numero_certificado: 'CAL-CERT-2026-0012',
    metrologo_laboratorio: 'Ing. Carlos Mendoza (Metrología Interna)',
    puntos_calibracion: [
      { punto_nominal: '0 PSI', lectura_patron: '0.00 PSI', lectura_instrumento: '0.0 PSI', error_calculado: '0.00%', conforme: true },
      { punto_nominal: '75 PSI', lectura_patron: '75.05 PSI', lectura_instrumento: '75.2 PSI', error_calculado: '+0.20%', conforme: true },
      { punto_nominal: '150 PSI', lectura_patron: '150.10 PSI', lectura_instrumento: '150.4 PSI', error_calculado: '+0.20%', conforme: true },
      { punto_nominal: '225 PSI', lectura_patron: '225.08 PSI', lectura_instrumento: '225.5 PSI', error_calculado: '+0.21%', conforme: true },
      { punto_nominal: '300 PSI', lectura_patron: '300.02 PSI', lectura_instrumento: '300.3 PSI', error_calculado: '+0.09%', conforme: true }
    ],
    observaciones: 'Instrumento opera dentro de clase de exactitud 0.5. Calcomanía de calibración N° 0012 adherida al visor.',
    proxima_calibracion: '15/07/2026'
  },
  {
    id_ot: 'CAL-2026-01-0002',
    codigo_eq: 'VALV-CALD01',
    cliente: 'TermoIndustrial del Sur S.A.',
    instrumento_nombre: 'Válvula de Seguridad y Alivio Caldera Cleaver Brooks',
    variable_medicion: 'Presión de Disparo / Alivio (PSV)',
    rango_operacion: 'Setpoint: 150 PSI',
    tolerancia_emp: '± 1.0% Setpoint (± 1.5 PSI)',
    frecuencia_calibracion: 'Anual',
    patron_utilizado: 'Banco Hidroneumático de Pruebas Spirax Sarco S/N 9901',
    trazabilidad_patron: 'CERT-CAL-TEST-2025-0128',
    fecha_emision: '10/01/2026',
    fecha_programada: '20/01/2026',
    fecha_tentativa: '25/01/2026',
    dias_tolerancia: 10,
    estado: 'Conforme (A tiempo)',
    fecha_real: '19/01/2026',
    dictamen: 'Conforme',
    error_max_hallado: '+0.40%',
    numero_certificado: 'CAL-CERT-2026-0018',
    metrologo_laboratorio: 'Téc. Roberto Valenzuela (Auditoría Vapor)',
    puntos_calibracion: [
      { punto_nominal: '150 PSI (Disparo 1)', lectura_patron: '150.6 PSI', lectura_instrumento: '150.6 PSI', error_calculado: '+0.40%', conforme: true },
      { punto_nominal: '150 PSI (Disparo 2)', lectura_patron: '150.4 PSI', lectura_instrumento: '150.4 PSI', error_calculado: '+0.27%', conforme: true },
      { punto_nominal: '150 PSI (Disparo 3)', lectura_patron: '150.5 PSI', lectura_instrumento: '150.5 PSI', error_calculado: '+0.33%', conforme: true },
      { punto_nominal: 'Hermeticidad 135 PSI', lectura_patron: 'Sin burbujas en 1 min', lectura_instrumento: 'Hermética', error_calculado: '0.00%', conforme: true }
    ],
    observaciones: 'Prueba de pop-action nítida y cierre estanco al 90% de presión de timbre. Precinto de plomo nuevo colocado.',
    proxima_calibracion: '19/01/2027'
  },
  {
    id_ot: 'CAL-2026-02-0001',
    codigo_eq: 'TERM-CALD01',
    cliente: 'TermoIndustrial del Sur S.A.',
    instrumento_nombre: 'Transmisor de Temperatura PT100 Chimenea Caldera',
    variable_medicion: 'Temperatura (°C)',
    rango_operacion: '0 a 400 °C',
    tolerancia_emp: '± 0.5 °C',
    frecuencia_calibracion: 'Semestral',
    patron_utilizado: 'Horno Calibrador de Bloque Seco Fluke 9142 S/N B401',
    trazabilidad_patron: 'CERT-TEMP-NIST-2025-081',
    fecha_emision: '02/02/2026',
    fecha_programada: '10/02/2026',
    fecha_tentativa: '15/02/2026',
    dias_tolerancia: 7,
    estado: 'Conforme (A tiempo)',
    fecha_real: '12/02/2026',
    dictamen: 'Ajustado y Conforme',
    error_max_hallado: '+0.28 °C',
    numero_certificado: 'CAL-CERT-2026-0045',
    metrologo_laboratorio: 'Téc. Roberto Valenzuela (Instrumentación)',
    puntos_calibracion: [
      { punto_nominal: '50 °C', lectura_patron: '50.02 °C', lectura_instrumento: '50.20 °C', error_calculado: '+0.18 °C', conforme: true },
      { punto_nominal: '150 °C', lectura_patron: '150.05 °C', lectura_instrumento: '150.33 °C', error_calculado: '+0.28 °C', conforme: true },
      { punto_nominal: '250 °C', lectura_patron: '250.01 °C', lectura_instrumento: '250.25 °C', error_calculado: '+0.24 °C', conforme: true },
      { punto_nominal: '350 °C', lectura_patron: '350.00 °C', lectura_instrumento: '350.15 °C', error_calculado: '+0.15 °C', conforme: true }
    ],
    observaciones: 'Se realizó ajuste de cero y span en el cabezal transmisor 4-20 mA. Retorno a especificación conforme.',
    proxima_calibracion: '12/08/2026'
  },
  {
    id_ot: 'CAL-2026-03-0001',
    codigo_eq: 'TRAN-COMP01',
    cliente: 'TermoIndustrial del Sur S.A.',
    instrumento_nombre: 'Transmisor de Presión Colector Red Aire Atlas Copco',
    variable_medicion: 'Presión Neumática (Bar)',
    rango_operacion: '0 a 16 Bar',
    tolerancia_emp: '± 0.25% FS (± 0.04 Bar)',
    frecuencia_calibracion: 'Anual',
    fecha_emision: '01/03/2026',
    fecha_programada: '15/03/2026',
    fecha_tentativa: '20/03/2026',
    dias_tolerancia: 5,
    estado: 'Pendiente',
    fecha_real: '',
    metrologo_laboratorio: 'Ing. Carlos Mendoza',
    observaciones: 'Programado en Plan de Calibración 2026.'
  },
  {
    id_ot: 'CAL-2026-03-0002',
    codigo_eq: 'MAN-REF01',
    cliente: 'Frigorífico Andino Austral',
    instrumento_nombre: 'Manómetro Compresor Amoníaco Mycom Alta Presión',
    variable_medicion: 'Presión NH3 (Bar)',
    rango_operacion: '-1 a 25 Bar',
    tolerancia_emp: '± 1.0% FS (± 0.26 Bar)',
    frecuencia_calibracion: 'Semestral',
    fecha_emision: '03/03/2026',
    fecha_programada: '18/03/2026',
    fecha_tentativa: '25/03/2026',
    dias_tolerancia: 7,
    estado: 'Pendiente',
    fecha_real: '',
    metrologo_laboratorio: 'Téc. Miguel Ángel Soto',
    observaciones: 'Requiere prueba de estanqueidad para amoníaco anhidro.'
  }
];

export const INITIAL_INSTRUMENTOS: Instrumento[] = [
  {
    codigo_inst: 'MAN-CH01',
    nombre: 'Manómetro Digital Presión Alta Chiller Trane',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipo_asociado: 'CH-01',
    variable_medicion: 'Presión Hidráulica / Refrigerante',
    rango_operacion: '0 a 300 PSI',
    tolerancia_emp: '± 0.5% FS (± 1.5 PSI)',
    frecuencia: 'Semestral',
    marca: 'Ashcroft',
    modelo: 'DG25 Digital High-Precision',
    numero_serie: 'ASH-2024-8841',
    ubicacion: 'Sala de Máquinas - Cabezal Chiller 1',
    estado: 'Activo',
    fecha_alta: '15/01/2024',
    fecha_proxima: '2026-01-15',
    patron_habitual: 'Balanza de Pesos Muertos Ametek PKII S/N 84120',
    metrologo_habitual: 'Ing. Carlos Mendoza (Metrología Interna)',
    notas: 'Instrumento patrón clase 0.5%. Salida 4-20mA.'
  },
  {
    codigo_inst: 'VALV-CALD01',
    nombre: 'Válvula de Seguridad y Alivio Caldera Cleaver Brooks',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipo_asociado: 'CALD-01',
    variable_medicion: 'Presión de Disparo / Alivio (PSV)',
    rango_operacion: 'Setpoint: 150 PSI',
    tolerancia_emp: '± 1.0% Setpoint (± 1.5 PSI)',
    frecuencia: 'Anual',
    marca: 'Spirax Sarco',
    modelo: 'SV73 Safety Relief Valve',
    numero_serie: 'SS-99412-B',
    ubicacion: 'Domo Superior Caldera Vapor Principal',
    estado: 'Activo',
    fecha_alta: '10/03/2023',
    fecha_proxima: '2026-01-20',
    patron_habitual: 'Banco Hidroneumático de Pruebas Spirax Sarco S/N 9901',
    metrologo_habitual: 'Téc. Roberto Valenzuela (Auditoría Vapor)',
    notas: 'Precinto de plomo codificado. Prueba de pop-action estricta.'
  },
  {
    codigo_inst: 'TERM-CALD01',
    nombre: 'Transmisor de Temperatura PT100 Chimenea Caldera',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipo_asociado: 'CALD-01',
    variable_medicion: 'Temperatura (°C)',
    rango_operacion: '0 a 400 °C',
    tolerancia_emp: '± 0.5 °C',
    frecuencia: 'Semestral',
    marca: 'Yokogawa',
    modelo: 'YTA70 Temperature Transmitter',
    numero_serie: 'YOKO-2023-7721',
    ubicacion: 'Conducto de Gases Caldera de Vapor',
    estado: 'Activo',
    fecha_alta: '05/06/2023',
    fecha_proxima: '2026-02-10',
    patron_habitual: 'Horno Calibrador de Bloque Seco Fluke 9142 S/N B401',
    metrologo_habitual: 'Téc. Roberto Valenzuela (Instrumentación)',
    notas: 'Termocupla / RTD PT100 con cabezal a prueba de intemperie IP67.'
  },
  {
    codigo_inst: 'TRAN-COMP01',
    nombre: 'Transmisor de Presión Colector Red Aire Atlas Copco',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipo_asociado: 'COMP-01',
    variable_medicion: 'Presión Neumática (Bar)',
    rango_operacion: '0 a 16 Bar',
    tolerancia_emp: '± 0.25% FS (± 0.04 Bar)',
    frecuencia: 'Anual',
    marca: 'Endress+Hauser',
    modelo: 'Cerabar PMP51',
    numero_serie: 'EH-PMP-55102',
    ubicacion: 'Caseta de Aire Comprimido - Manifold Principal',
    estado: 'Activo',
    fecha_alta: '20/11/2023',
    fecha_proxima: '2026-03-15',
    patron_habitual: 'Calibrador de Presión Documentador Fluke 729',
    metrologo_habitual: 'Ing. Carlos Mendoza',
    notas: 'Sensor cerámico de alta estabilidad a largo plazo.'
  },
  {
    codigo_inst: 'MAN-REF01',
    nombre: 'Manómetro Compresor Amoníaco Mycom Alta Presión',
    cliente: 'Frigorífico Andino Austral',
    equipo_asociado: 'REF-01',
    variable_medicion: 'Presión NH3 (Bar)',
    rango_operacion: '-1 a 25 Bar',
    tolerancia_emp: '± 1.0% FS (± 0.26 Bar)',
    frecuencia: 'Semestral',
    marca: 'WIKA',
    modelo: '233.50 Amoníaco Inox',
    numero_serie: 'WIK-2024-9102',
    ubicacion: 'Sala Frío Túnel 3 - Descarga Mycom',
    estado: 'Activo',
    fecha_alta: '12/01/2024',
    fecha_proxima: '2026-03-18',
    patron_habitual: 'Módulo de Presión Aislado Fluke 700P07',
    metrologo_habitual: 'Téc. Miguel Ángel Soto',
    notas: 'Construcción en acero inoxidable 316L con glicerina.'
  },
  {
    codigo_inst: 'MAN-AUX01',
    nombre: 'Manómetro Análogo Auxiliar Retorno Condensado',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipo_asociado: 'CALD-01',
    variable_medicion: 'Presión Vapor / Condensado',
    rango_operacion: '0 a 100 PSI',
    tolerancia_emp: '± 2.0% FS',
    frecuencia: 'Anual',
    marca: 'WIKA',
    modelo: '111.10 Bourdon',
    numero_serie: 'WIK-2021-0041',
    ubicacion: 'Línea Retorno Condensados Tanque Nodriza',
    estado: 'Baja',
    fecha_alta: '10/01/2022',
    fecha_proxima: '2025-01-10',
    fecha_baja: '15/12/2025',
    motivo_baja: 'Rotura de tubo Bourdon por golpe de ariete hidráulico. Reemplazado por transmisor electrónico.',
    patron_habitual: 'Balanza de Pesos Muertos',
    metrologo_habitual: 'Ing. Carlos Mendoza',
    notas: 'Instrumento retirado y desincorporado del padrón de metrología activa.'
  }
];

export const INITIAL_REPUESTOS: Repuesto[] = [
  {
    id: 'REP-01',
    codigo_repuesto: 'REP-ROD-6312C3',
    nombre: 'Rodamiento Rígido de Bolas SKF 6312/C3',
    descripcion: 'Diámetro int: 60mm, ext: 130mm, ancho: 31mm. Juego radial C3 para alta temperatura y velocidad continua.',
    categoria: 'Rodamientos',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipos_asociados: ['CH-01', 'BOMB-01'],
    criticidad: 'Crítico',
    stock_actual: 4,
    stock_minimo: 2,
    stock_seguridad: 1,
    unidad_medida: 'Unidad',
    ubicacion_almacen: 'Almacén Central - Estante A1 - Gaveta 04',
    precio_unitario: 145.0,
    moneda: 'USD',
    proveedor: 'SKF Rodamientos Industriales Chile',
    contacto_proveedor: 'ventas@skfdistribucion.cl / +56 2 2940 3300',
    tiempo_entrega_dias: 3,
    numero_parte_fabricante: '6312-2Z/C3',
    fecha_ultima_compra: '15/01/2026',
    observaciones: 'Mantener en empaque sellado anticorrosivo con desecante.'
  },
  {
    id: 'REP-02',
    codigo_repuesto: 'REP-SEL-CR45',
    nombre: 'Sello Mecánico Cartucho SiC/SiC/Viton 45mm',
    descripcion: 'Sello balanceado tipo cartucho para agua desmineralizada a 140°C. Caras carburo de silicio / carburo de silicio.',
    categoria: 'Sellos y Empaques',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipos_asociados: ['BOMB-01'],
    criticidad: 'Crítico',
    stock_actual: 1, // ALERTA: <= stock_minimo
    stock_minimo: 2,
    stock_seguridad: 1,
    unidad_medida: 'Juego/Kit',
    ubicacion_almacen: 'Almacén Central - Estante B2 - Gaveta 12',
    precio_unitario: 520.0,
    moneda: 'USD',
    proveedor: 'John Crane Mechanical Seals S.A.',
    contacto_proveedor: 'soporte@johncrane.cl / +56 2 2450 7800',
    tiempo_entrega_dias: 14,
    numero_parte_fabricante: 'JC-5610-45MM',
    fecha_ultima_compra: '05/12/2025',
    observaciones: '¡STOCK EN ALERTA DE REPOSICIÓN! Indispensable para continuidad de caldera.'
  },
  {
    id: 'REP-03',
    codigo_repuesto: 'REP-LUB-SO120',
    nombre: 'Aceite Sintético Polioléster Solest 120 (Tambor 20L)',
    descripcion: 'Lubricante sintético POE para compresores frigoríficos y chillers centrífugos con refrigerante R-134a.',
    categoria: 'Lubricantes',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipos_asociados: ['CH-01'],
    criticidad: 'Crítico',
    stock_actual: 5,
    stock_minimo: 2,
    stock_seguridad: 1,
    unidad_medida: 'Bidón 20L',
    ubicacion_almacen: 'Patio Químicos - Rack Lubricantes L-01',
    precio_unitario: 380.0,
    moneda: 'USD',
    proveedor: 'Lubricantes Especiales CPI Fluid Engineering',
    contacto_proveedor: 'pedidos@cpiexpertos.cl / +56 2 2780 1120',
    tiempo_entrega_dias: 5,
    numero_parte_fabricante: 'CPI-SOLEST-120-20L',
    fecha_ultima_compra: '10/01/2026',
    observaciones: 'Aceite higroscópico. No abrir hasta el momento exacto de la carga al chiller.'
  },
  {
    id: 'REP-04',
    codigo_repuesto: 'REP-FIL-AC75',
    nombre: 'Kit Filtro Separador Aire/Aceite Atlas Copco GA-75',
    descripcion: 'Cartucho coalescente separador aire-aceite para compresor de tornillo rotativo GA-75 VSD.',
    categoria: 'Filtros',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipos_asociados: ['COMP-01'],
    criticidad: 'Crítico',
    stock_actual: 3,
    stock_minimo: 1,
    stock_seguridad: 1,
    unidad_medida: 'Kit',
    ubicacion_almacen: 'Almacén Central - Estante C1 - Balda 3',
    precio_unitario: 295.0,
    moneda: 'USD',
    proveedor: 'Atlas Copco Chilena S.A.C.',
    contacto_proveedor: 'repuestos.chile@atlascopco.com / +56 2 2442 3600',
    tiempo_entrega_dias: 4,
    numero_parte_fabricante: 'AC-1622-0871-00',
    fecha_ultima_compra: '18/01/2026',
    observaciones: 'Incluye junta tórica de estanqueidad y conductos de retorno de aceite.'
  },
  {
    id: 'REP-05',
    codigo_repuesto: 'REP-VAL-CB150',
    nombre: 'Kit Reacondicionamiento Válvula Seguridad Caldera 150 PSI',
    descripcion: 'Tobera, disco de acero inoxidable y resorte templado certificado ASME Sec. I para Cleaver Brooks 500 BHP.',
    categoria: 'Válvulas',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipos_asociados: ['CALD-01'],
    criticidad: 'Crítico',
    stock_actual: 2,
    stock_minimo: 1,
    stock_seguridad: 1,
    unidad_medida: 'Kit',
    ubicacion_almacen: 'Almacén Central - Armario de Seguridad V-02',
    precio_unitario: 680.0,
    moneda: 'USD',
    proveedor: 'Válvulas & Vapor Ingeniería Ltda.',
    contacto_proveedor: 'ingenieria@valvulasvapor.cl / +56 2 2310 9940',
    tiempo_entrega_dias: 7,
    numero_parte_fabricante: 'CB-KIT-V150-ASME',
    fecha_ultima_compra: '08/01/2026',
    observaciones: 'Viene con certificado de calibración en banco de pruebas de vapor saturado.'
  },
  {
    id: 'REP-06',
    codigo_repuesto: 'REP-ELE-CON80',
    nombre: 'Contactor Tripolar Schneider TeSys Deca 80A 220VAC',
    descripcion: 'Contactor de potencia 3P AC-3 37kW 80A bobina 220VAC 50/60Hz con contactos auxiliares 1NA+1NC.',
    categoria: 'Eléctrico',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipos_asociados: ['SUB-01', 'CH-01', 'COMP-01'],
    criticidad: 'Media',
    stock_actual: 6,
    stock_minimo: 2,
    stock_seguridad: 1,
    unidad_medida: 'Unidad',
    ubicacion_almacen: 'Almacén Eléctrico - Estante E2 - Gaveta 08',
    precio_unitario: 115.0,
    moneda: 'USD',
    proveedor: 'ElectroIndustrial Distribución S.A.',
    contacto_proveedor: 'ventas@electroind.cl / +56 2 2670 4400',
    tiempo_entrega_dias: 2,
    numero_parte_fabricante: 'LC1D80M7',
    fecha_ultima_compra: '20/01/2026',
    observaciones: 'Apto para arranque estrella-triángulo o directo de motores pesados.'
  },
  {
    id: 'REP-07',
    codigo_repuesto: 'REP-REF-SUN4GS',
    nombre: 'Aceite Mineral Refinación Nafténica Suniso 4GS (Balde 19L)',
    descripcion: 'Aceite de alta estabilidad química y bajo punto de congelación para sistemas de amoníaco NH3.',
    categoria: 'Lubricantes',
    cliente: 'Frigorífico Andino Austral',
    equipos_asociados: ['REF-01'],
    criticidad: 'Crítico',
    stock_actual: 1, // ALERTA: <= stock_minimo
    stock_minimo: 3,
    stock_seguridad: 2,
    unidad_medida: 'Balde 19L',
    ubicacion_almacen: 'Cámara Bodega Frío - Rack Lubricantes NH3',
    precio_unitario: 240.0,
    moneda: 'USD',
    proveedor: 'Frío Industrial Austral Repuestos',
    contacto_proveedor: 'repuestos@frioaustral.cl / +56 2 2890 5510',
    tiempo_entrega_dias: 6,
    numero_parte_fabricante: 'SUNISO-4GS-19L',
    fecha_ultima_compra: '12/12/2025',
    observaciones: '¡CRÍTICO EN ALERTA DE STOCK! Generar orden de compra a proveedor.'
  },
  {
    id: 'REP-08',
    codigo_repuesto: 'REP-SEN-PT100D',
    nombre: 'Termorresistencia PT100 Duplex Clase A Vaina Inox 316',
    descripcion: 'Sensor doble elemento PT100 DIN IEC 751 con cabezal DIN B aluminio y vaina de 1/2" NPT x 250mm.',
    categoria: 'Instrumentación',
    cliente: 'TermoIndustrial del Sur S.A.',
    equipos_asociados: ['CALD-01'],
    criticidad: 'Media',
    stock_actual: 3,
    stock_minimo: 1,
    stock_seguridad: 1,
    unidad_medida: 'Unidad',
    ubicacion_almacen: 'Taller de Instrumentación - Gaveta Sensores S-03',
    precio_unitario: 165.0,
    moneda: 'USD',
    proveedor: 'WIKA Instrumentación S.A.',
    contacto_proveedor: 'ventas@wika.cl / +56 2 2845 0000',
    tiempo_entrega_dias: 5,
    numero_parte_fabricante: 'TR10-D-PT100-250',
    fecha_ultima_compra: '22/01/2026',
    observaciones: 'Inspeccionado y verificado metrológicamente contra baño térmico.'
  }
];

export const INITIAL_MOVIMIENTOS_REPUESTOS: MovimientoRepuesto[] = [
  {
    id: 'MOV-01',
    repuesto_id: 'REP-01',
    codigo_repuesto: 'REP-ROD-6312C3',
    nombre_repuesto: 'Rodamiento Rígido de Bolas SKF 6312/C3',
    tipo: 'Entrada',
    cantidad: 6,
    stock_anterior: 0,
    stock_nuevo: 6,
    fecha: '15/01/2026 09:30',
    motivo: 'Recepción Factura de Compra F-4892 - Lote anual rodamientos',
    solicitante: 'Pañolero Central Roberto Valenzuela'
  },
  {
    id: 'MOV-02',
    repuesto_id: 'REP-01',
    codigo_repuesto: 'REP-ROD-6312C3',
    nombre_repuesto: 'Rodamiento Rígido de Bolas SKF 6312/C3',
    tipo: 'Salida',
    cantidad: 2,
    stock_anterior: 6,
    stock_nuevo: 4,
    fecha: '20/01/2026 14:15',
    motivo: 'Sustitución en Mantenimiento Preventivo Chiller Trane',
    ot_asociada: 'MP-2026-01-0001',
    equipo_asociado: 'CH-01',
    solicitante: 'Téc. Miguel Ángel Soto'
  },
  {
    id: 'MOV-03',
    repuesto_id: 'REP-02',
    codigo_repuesto: 'REP-SEL-CR45',
    nombre_repuesto: 'Sello Mecánico Cartucho SiC/SiC/Viton 45mm',
    tipo: 'Salida',
    cantidad: 1,
    stock_anterior: 2,
    stock_nuevo: 1,
    fecha: '22/01/2026 11:00',
    motivo: 'Atención de fuga por empaquetadura en Bomba Grundfos',
    ot_asociada: 'MC-2026-01-0001',
    equipo_asociado: 'BOMB-01',
    solicitante: 'Téc. Fernando Morales'
  }
];


