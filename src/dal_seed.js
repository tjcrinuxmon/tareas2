const sid = (n) => `seed${String(n).padStart(4,'0')}`

const ACTORES = [
  { id:sid(1),   expediente:'SG-JLI-33/2025',    actor:'JUAN CARLOS HERRERA MENDOZA',     ano:'2025', observaciones:'' },
  { id:sid(2),   expediente:'SG-JLI-34/2025',    actor:'PATRICIA LUNA SÁNCHEZ',           ano:'2025', observaciones:'' },
  { id:sid(3),   expediente:'SX-JLI-22/2025',    actor:'ROSALBA GALINDO REYES',           ano:'2025', observaciones:'' },
  { id:sid(4),   expediente:'SUP-JLI-34/2025',   actor:'ARMANDO FLORES GUERRERO',         ano:'2025', observaciones:'' },
  { id:sid(5),   expediente:'SUP-JLI-51/2025',   actor:'CARLOS ALBERTO VEGA IBARRA',      ano:'2025', observaciones:'' },
  { id:sid(6),   expediente:'SUP-AG-7/2026',     actor:'MARGARITA OSNAYA ALVARADO',       ano:'2026', observaciones:'' },
  { id:sid(7),   expediente:'SCM-JLI-2/2026',    actor:'ROBERTO ESTRADA MONTOYA',         ano:'2026', observaciones:'' },
  { id:sid(8),   expediente:'330/II/2011-IV',    actor:'CELESTINO ACOSTA LARA',           ano:'2011', observaciones:'Expediente antiguo en seguimiento' },
  { id:sid(9),   expediente:'SUP-JLI-14/2026',   actor:'JUAN FRANCISCO CANCINO LEZAMA',   ano:'2026', observaciones:'' },
  { id:sid(10),  expediente:'SUP-AG-36/2026',    actor:'LIZBETH AHELYN HURTADO CARRILLO', ano:'2026', observaciones:'' },
  { id:sid(11),  expediente:'ST-JLI-4/2026',     actor:'HÉCTOR GONZÁLEZ LICEA',           ano:'2026', observaciones:'' },
  { id:sid(12),  expediente:'SG-JLI-5/2026',     actor:'YALILA ÁVAREZ ATIENZO',           ano:'2026', observaciones:'' },
  { id:sid(13),  expediente:'ST-JLI-8/2026',     actor:'DOLORES ESQUIVEL OCHOA',          ano:'2026', observaciones:'' },
  { id:sid(14),  expediente:'SX-JLI-8/2026',     actor:'MARIO ARTURO LARA CATZIN',        ano:'2026', observaciones:'' },
  { id:sid(15),  expediente:'200/24-2025/JL-I',  actor:'MARÍA DEL CARMEN PÉREZ LÓPEZ',    ano:'2025', observaciones:'Conciliación en trámite' },
]

const EMPLAZ = [
  { id:sid(51),  expediente:'SG-JLI-33/2025',   fechaEmplaz:'2025-10-15', abogado:'Eduardo',   entregaFicha:true,  revision:true,  vencimiento:'2025-11-10', entregaTribunal:'2025-11-05', medioEntrega:'Física',          actoImpugnado:'Resolución de rescisión de contrato' },
  { id:sid(52),  expediente:'SG-JLI-34/2025',   fechaEmplaz:'2025-10-15', abogado:'Edgar',     entregaFicha:true,  revision:false, vencimiento:'2025-11-10', entregaTribunal:'',           medioEntrega:'',                actoImpugnado:'Rescisión de relación laboral' },
  { id:sid(53),  expediente:'SX-JLI-22/2025',   fechaEmplaz:'2025-10-18', abogado:'JC',        entregaFicha:false, revision:false, vencimiento:'2025-11-17', entregaTribunal:'2025-11-14', medioEntrega:'Paquetería DHL',  actoImpugnado:'Terminación de nombramiento' },
  { id:sid(54),  expediente:'SUP-JLI-34/2025',  fechaEmplaz:'2025-11-01', abogado:'Edgar',     entregaFicha:true,  revision:true,  vencimiento:'2025-11-22', entregaTribunal:'2025-11-20', medioEntrega:'Física',          actoImpugnado:'No ratificación de cargo' },
  { id:sid(55),  expediente:'SUP-JLI-51/2025',  fechaEmplaz:'2025-12-10', abogado:'Aníbal',    entregaFicha:true,  revision:false, vencimiento:'2026-01-05', entregaTribunal:'',           medioEntrega:'',                actoImpugnado:'Remoción de cargo de confianza' },
  { id:sid(56),  expediente:'SUP-AG-7/2026',    fechaEmplaz:'2026-01-22', abogado:'JC',        entregaFicha:true,  revision:true,  vencimiento:'2026-02-12', entregaTribunal:'2026-02-10', medioEntrega:'Auxilio Jurisdiccional', actoImpugnado:'Resolución administrativa sancionatoria' },
  { id:sid(57),  expediente:'SCM-JLI-2/2026',   fechaEmplaz:'2026-03-10', abogado:'Luis Carlos',entregaFicha:false,revision:false, vencimiento:'2026-04-05', entregaTribunal:'',           medioEntrega:'',                actoImpugnado:'Destitución e inhabilitación' },
]

const NOEMPLAZ = [
  { id:sid(71),  expediente:'SX-JLI-5/2025',    sentido:'Sobreseimiento',     actor:'ERNESTO JAVIER MORALES RÍOS',     estatus:'SE DESECHA',             observaciones:'Desechado por extemporáneo' },
  { id:sid(72),  expediente:'SUP-JLI-11/2025',  sentido:'Improcedencia',      actor:'DIANA PATRICIA SALINAS GUZMÁN',   estatus:'EMPLAZAMIENTO PENDIENTE', observaciones:'En espera de notificación' },
  { id:sid(73),  expediente:'SG-CA-112/2025',   sentido:'Confirmación',       actor:'MIGUEL ÁNGEL TORRES CRUZ',        estatus:'EMPLAZADO',               observaciones:'' },
  { id:sid(74),  expediente:'ST-JLI-3/2026',    sentido:'',                   actor:'LORENA VÁZQUEZ HIDALGO',          estatus:'EMPLAZAMIENTO PENDIENTE', observaciones:'Pendiente recepción de oficio' },
  { id:sid(75),  expediente:'SG-JLI-1/2026',    sentido:'Sobreseimiento',     actor:'RAFAEL DOMÍNGUEZ SOLANO',         estatus:'SE DESECHA',             observaciones:'Falta de legitimación' },
  { id:sid(76),  expediente:'SUP-AG-12/2026',   sentido:'',                   actor:'CLAUDIA BEATRIZ REYES MONTIEL',   estatus:'EMPLAZAMIENTO PENDIENTE', observaciones:'' },
]

const SENTENCIAS = [
  { id:sid(101), expediente:'SG-JLI-33/2025',   fechaNotificacion:'2025-11-12', plazo:15, fechaVencimiento:'2025-11-27', abogado:'Eduardo',    fechaEntregaTEPJF:'2025-11-25', observaciones:'' },
  { id:sid(102), expediente:'SG-JLI-34/2025',   fechaNotificacion:'2025-11-12', plazo:15, fechaVencimiento:'2025-11-27', abogado:'Edgar',      fechaEntregaTEPJF:'',           observaciones:'Pendiente elaboración de informe' },
  { id:sid(103), expediente:'SX-JLI-22/2025',   fechaNotificacion:'2025-11-18', plazo:10, fechaVencimiento:'2025-11-28', abogado:'JC',         fechaEntregaTEPJF:'2025-11-27', observaciones:'' },
  { id:sid(104), expediente:'SUP-JLI-34/2025',  fechaNotificacion:'2025-11-24', plazo:15, fechaVencimiento:'2025-12-09', abogado:'Edgar',      fechaEntregaTEPJF:'2025-12-05', observaciones:'' },
  { id:sid(105), expediente:'SG-JLI-33/2025',   fechaNotificacion:'2025-12-03', plazo:15, fechaVencimiento:'2025-12-18', abogado:'Eduardo',    fechaEntregaTEPJF:'2025-12-15', observaciones:'Segunda sentencia' },
  { id:sid(106), expediente:'SUP-JLI-51/2025',  fechaNotificacion:'2026-01-02', plazo:15, fechaVencimiento:'2026-01-17', abogado:'Aníbal',     fechaEntregaTEPJF:'2026-01-15', observaciones:'' },
  { id:sid(107), expediente:'SUP-AG-7/2026',    fechaNotificacion:'2026-02-03', plazo:15, fechaVencimiento:'2026-02-18', abogado:'JC',         fechaEntregaTEPJF:'2026-02-17', observaciones:'' },
  { id:sid(108), expediente:'SCM-JLI-2/2026',   fechaNotificacion:'2026-03-23', plazo:15, fechaVencimiento:'2026-04-07', abogado:'Luis Carlos',fechaEntregaTEPJF:'',           observaciones:'En elaboración' },
]

const REQUERIMS = [
  { id:sid(151), expediente:'SG-JLI-33/2025',   fechaNotificacion:'2025-12-10', plazo:5,  fechaVencimiento:'2025-12-15', abogado:'Eduardo',    fechaEntregaTEPJF:'2025-12-14', observaciones:'Requerimiento de información adicional' },
  { id:sid(152), expediente:'SUP-JLI-51/2025',  fechaNotificacion:'2026-01-15', plazo:3,  fechaVencimiento:'2026-01-18', abogado:'Aníbal',     fechaEntregaTEPJF:'2026-01-17', observaciones:'' },
  { id:sid(153), expediente:'SCM-JLI-2/2026',   fechaNotificacion:'2026-04-10', plazo:5,  fechaVencimiento:'2026-04-15', abogado:'Luis Carlos',fechaEntregaTEPJF:'',           observaciones:'Requerimiento de pruebas documentales' },
  { id:sid(154), expediente:'SUP-AG-36/2026',   fechaNotificacion:'2026-04-02', plazo:5,  fechaVencimiento:'2026-04-07', abogado:'',           fechaEntregaTEPJF:'',           observaciones:'' },
  { id:sid(155), expediente:'ST-JLI-8/2026',    fechaNotificacion:'2026-04-25', plazo:3,  fechaVencimiento:'2026-04-28', abogado:'Eduardo',    fechaEntregaTEPJF:'',           observaciones:'Requerimiento urgente' },
]

const CUMPLIMS = [
  { id:sid(201), expediente:'SG-JLI-33/2025',  actor:'JUAN CARLOS HERRERA MENDOZA',   sentencia:'2025-11-12', condena:'Reinstalación y pago de salarios caídos',    prestacionesPagadas:'Salarios caídos de oct-dic 2025',    prestacionesPorCumplir:'Reinstalación efectiva',          abogado:'Eduardo',    returno:'', notificaciones:'Notificado el 15/11/2025', fechaEntrega:'', estatus:'PRESENTADA' },
  { id:sid(202), expediente:'SX-JLI-22/2025',  actor:'ROSALBA GALINDO REYES',         sentencia:'2025-11-18', condena:'Pago de liquidación conforme a contrato',   prestacionesPagadas:'Prima vacacional y aguinaldo',       prestacionesPorCumplir:'Partes proporcionales pendientes', abogado:'JC',         returno:'', notificaciones:'', fechaEntrega:'2026-02-28', estatus:'FORMALMENTE CONCLUIDO' },
  { id:sid(203), expediente:'SUP-AG-7/2026',   actor:'MARGARITA OSNAYA ALVARADO',     sentencia:'2026-02-03', condena:'Pago de diferencias salariales',             prestacionesPagadas:'',                                   prestacionesPorCumplir:'Diferencias salariales 2023-2025', abogado:'JC',         returno:'2026-03-15', notificaciones:'Notificado 10/02/2026', fechaEntrega:'', estatus:'PRESENTADA' },
  { id:sid(204), expediente:'330/II/2011-IV',  actor:'CELESTINO ACOSTA LARA',         sentencia:'2012-05-20', condena:'Reconocimiento de antigüedad y prestaciones', prestacionesPagadas:'Partes proporcionales 2012-2020',    prestacionesPorCumplir:'Reconocimiento formal de antigüedad', abogado:'',         returno:'', notificaciones:'Expediente histórico', fechaEntrega:'', estatus:'PRESENTADA' },
]

const INCIDENTES = [
  { id:sid(251), expediente:'SG-JLI-33/2025',  fechaNotificacion:'2025-12-05', plazo:3, fechaVencimiento:'2025-12-08', abogado:'Eduardo' },
  { id:sid(252), expediente:'SUP-JLI-34/2025', fechaNotificacion:'2025-12-10', plazo:5, fechaVencimiento:'2025-12-15', abogado:'Edgar' },
  { id:sid(253), expediente:'SUP-AG-7/2026',   fechaNotificacion:'2026-02-10', plazo:3, fechaVencimiento:'2026-02-13', abogado:'JC' },
  { id:sid(254), expediente:'SCM-JLI-2/2026',  fechaNotificacion:'2026-04-15', plazo:5, fechaVencimiento:'2026-04-20', abogado:'Luis Carlos' },
  { id:sid(255), expediente:'ST-JLI-8/2026',   fechaNotificacion:'2026-04-30', plazo:3, fechaVencimiento:'2026-05-03', abogado:'Eduardo' },
]

const REENCAUZ = [
  { id:sid(301), expediente:'SUP-JLI-14/2026', fechaNotificacion:'2026-03-04', actor:'JUAN FRANCISCO CANCINO LEZAMA',   abogado:'',           notas:'' },
  { id:sid(302), expediente:'SUP-AG-36/2026',  fechaNotificacion:'2026-03-19', actor:'LIZBETH AHELYN HURTADO CARRILLO', abogado:'',           notas:'' },
  { id:sid(303), expediente:'ST-JLI-4/2026',   fechaNotificacion:'',           actor:'HÉCTOR GONZÁLEZ LICEA',           abogado:'Anay',       notas:'' },
  { id:sid(304), expediente:'SG-JLI-5/2026',   fechaNotificacion:'2026-03-26', actor:'YALILA ÁVAREZ ATIENZO',           abogado:'Luis Carlos',notas:'' },
  { id:sid(305), expediente:'ST-JLI-8/2026',   fechaNotificacion:'2026-04-22', actor:'DOLORES ESQUIVEL OCHOA',          abogado:'Eduardo',    notas:'' },
  { id:sid(306), expediente:'SX-JLI-8/2026',   fechaNotificacion:'2026-04-21', actor:'MARIO ARTURO LARA CATZIN',        abogado:'JC',         notas:'' },
  { id:sid(307), expediente:'SG-JLI-6/2026',   fechaNotificacion:'2026-04-27', actor:'',                                abogado:'',           notas:'Reencauzamiento de JLI a JG' },
]

const OIC = [
  { id:sid(401), expediente:'1409/25-RA-1-01-6',    fechaNotificacion:'2026-01-29', numeroOficio:'96-1-3-5496/26',       responsable:'SELENE SUÁREZ RODRÍGUEZ' },
  { id:sid(402), expediente:'INE/OIC/INV/003/2022', fechaNotificacion:'',           numeroOficio:'',                     responsable:'' },
  { id:sid(403), expediente:'SCM-JLI-58/2023',      fechaNotificacion:'2026-04-06', numeroOficio:'INE/OIC/UAJ/444/2026', responsable:'SALVADOR RAMOS VALDÉS' },
  { id:sid(404), expediente:'INE/DJ/HASL/115/2023', fechaNotificacion:'2026-04-08', numeroOficio:'INE/OIC/UAJ/468/2026', responsable:'JUANA CARMEN MUÑOZ BONILLA' },
]

const CONCILIACION = [
  { id:sid(501), expediente:'200/24-2025/JL-I', actor:'MARÍA DEL CARMEN PÉREZ LÓPEZ', fechaNotificacion:'2026-01-08', fechaAudiencia:'', ubicacion:'', abogado:'' },
]

const AMPAROS = [
  { id:sid(601), expediente:'SG-JLI-33/2025+SG-CA-253/2025', fechaNotificacion:'2025-11-12', actor:'', plazo:'',   fechaVencimiento:'', abogado:'',          tribunal:'',                          fechaCumplimiento:'' },
  { id:sid(602), expediente:'SG-JLI-34/2025+SG-CA-254/2025', fechaNotificacion:'2025-11-12', actor:'', plazo:'',   fechaVencimiento:'', abogado:'',          tribunal:'',                          fechaCumplimiento:'' },
  { id:sid(603), expediente:'SX-JLI-22/2025',                 fechaNotificacion:'2025-11-12', actor:'', plazo:'',   fechaVencimiento:'', abogado:'',          tribunal:'',                          fechaCumplimiento:'' },
  { id:sid(604), expediente:'SG-JLI-33/2025',                 fechaNotificacion:'2025-11-14', actor:'', plazo:'',   fechaVencimiento:'', abogado:'',          tribunal:'',                          fechaCumplimiento:'' },
  { id:sid(605), expediente:'330/II/2011-IV',                  fechaNotificacion:'',           actor:'CELESTINO ACOSTA LARA', plazo:'', fechaVencimiento:'', abogado:'',   tribunal:'',             fechaCumplimiento:'' },
  { id:sid(606), expediente:'SX-JLI-22/2025',                 fechaNotificacion:'2025-11-18', actor:'ROSALBA GALINDO', plazo:'',       fechaVencimiento:'', abogado:'',          tribunal:'',       fechaCumplimiento:'' },
  { id:sid(607), expediente:'SUP-JLI-34/2025',                fechaNotificacion:'2025-11-24', actor:'', plazo:'',   fechaVencimiento:'', abogado:'Edgar',     tribunal:'',                          fechaCumplimiento:'' },
  { id:sid(608), expediente:'SG-JLI-33/2025',                 fechaNotificacion:'2025-12-03', actor:'', plazo:'',   fechaVencimiento:'', abogado:'Eduardo',   tribunal:'Sala Regional Guadalajara',  fechaCumplimiento:'' },
  { id:sid(609), expediente:'SUP-JLI-51/2025',                fechaNotificacion:'2026-01-02', actor:'', plazo:'',   fechaVencimiento:'', abogado:'Aníbal',    tribunal:'Sala Superior',             fechaCumplimiento:'' },
  { id:sid(610), expediente:'SUP-AG-7/2026',                  fechaNotificacion:'2026-02-03', actor:'', plazo:15,   fechaVencimiento:'2026-02-25', abogado:'JC', tribunal:'Sala Superior',          fechaCumplimiento:'' },
  { id:sid(611), expediente:'SCM-JLI-2/2026',                 fechaNotificacion:'2026-03-23', actor:'', plazo:'',   fechaVencimiento:'', abogado:'Luis Carlos',tribunal:'Sala Regional CDMX',        fechaCumplimiento:'' },
]

import { seedDalSection } from './api.js'

export async function applyDalSeed(force = false) {
  const MAP = {
    actores: ACTORES, emplaz: EMPLAZ, noemplaz: NOEMPLAZ,
    sentencias: SENTENCIAS, requerims: REQUERIMS, cumplims: CUMPLIMS,
    incidentes: INCIDENTES, amparos: AMPAROS, conciliacion: CONCILIACION,
    oic: OIC, reencauz: REENCAUZ,
  }
  const results = await Promise.all(
    Object.entries(MAP).map(async ([section, data]) => {
      const res = await seedDalSection(section, data, force)
      return [section, res.skipped ? null : res]
    })
  )
  return Object.fromEntries(results)
}
