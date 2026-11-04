/**
 * Catálogo inteligente de Ubigeos SUNAT / INEI para Lima Metropolitana, Callao y principales provincias
 */

export const SAP_PERU_DEPARTMENTS = [
  { code: "01", name: "AMAZONAS" },
  { code: "02", name: "ANCASH" },
  { code: "03", name: "APURÍMAC", cleanName: "APURIMAC" },
  { code: "04", name: "AREQUIPA" },
  { code: "05", name: "AYACUCHO" },
  { code: "06", name: "CAJAMARCA" },
  { code: "07", name: "CALLAO" },
  { code: "08", name: "CUSCO" },
  { code: "09", name: "HUANCAVELICA" },
  { code: "10", name: "HUÁNUCO", cleanName: "HUANUCO" },
  { code: "11", name: "ICA" },
  { code: "12", name: "JUNÍN", cleanName: "JUNIN" },
  { code: "13", name: "LA LIBERTAD" },
  { code: "14", name: "LAMBAYEQUE" },
  { code: "15", name: "LIMA" },
  { code: "16", name: "LORETO" },
  { code: "17", name: "MADRE DE DIOS" },
  { code: "18", name: "MOQUEGUA" },
  { code: "19", name: "PASCO" },
  { code: "20", name: "PIURA" },
  { code: "21", name: "PUNO" },
  { code: "22", name: "SAN MARTIN" },
  { code: "23", name: "TACNA" },
  { code: "24", name: "TUMBES" },
  { code: "25", name: "UCAYALI" },
];

export const PERU_DEPARTMENTS = SAP_PERU_DEPARTMENTS.map((d) => d.name);

export function getDepartmentByCode(code) {
  if (!code) return null;
  const cleanCode = String(code).trim().padStart(2, "0");
  return SAP_PERU_DEPARTMENTS.find((d) => d.code === cleanCode) || null;
}

export function getDepartmentByName(name) {
  if (!name) return null;
  const clean = normalizeString(name);
  return (
    SAP_PERU_DEPARTMENTS.find(
      (d) => normalizeString(d.name) === clean || (d.cleanName && normalizeString(d.cleanName) === clean)
    ) || null
  );
}


export const PERU_PROVINCES_BY_DEPT = {
  LIMA: ["LIMA", "BARRANCA", "CAJATAMBO", "CANTA", "CAÑETE", "HUARAL", "HUAROCHIRI", "HUAURA", "OYON", "YAUYOS"],
  CALLAO: ["CALLAO"],
  AREQUIPA: ["AREQUIPA", "CAMANA", "CARAVELI", "CASTILLA", "CAYLLOMA", "CONDESUYOS", "ISLAY", "LA UNION"],
  "LA LIBERTAD": ["TRUJILLO", "ASCOPE", "BOLIVAR", "CHEPEN", "GRAN CHIMU", "JULCAN", "OTUZCO", "PACASMAYO", "PATAZ", "SANCHEZ CARRION", "SANTIAGO DE CHUCO", "VIRU"],
  LAMBAYEQUE: ["CHICLAYO", "FERREÑAFE", "LAMBAYEQUE"],
  PIURA: ["PIURA", "AYABACA", "HUANCABAMBA", "MORROPON", "PAITA", "SULLANA", "TALARA", "SECHURA"],
  JUNIN: ["HUANCAYO", "CONCEPCION", "CHANCHAMAYO", "JAUJA", "JUNIN", "SATIPO", "TARMA", "YAULI", "CHUPACA"],
  CUSCO: ["CUSCO", "ACOMAYO", "ANTA", "CALCA", "CANAS", "CANCHIS", "CHUMBIVILCAS", "ESPINAR", "LA CONVENCION", "PARURO", "PAUCARTAMBO", "QUISPICANCHI", "URUBAMBA"],
  ICA: ["ICA", "CHINCHA", "NAZCA", "PALPA", "PISCO"],
  ANCASH: ["HUARAZ", "AIJA", "ANTONIO RAYMONDI", "ASUNCION", "BOLOGNESI", "CARHUAZ", "CARLOS FERMIN FITZCARRALD", "CASMA", "CORONGO", "HUARI", "HUARMEY", "HUAYLAS", "MARISCAL LUZURIAGA", "OCROS", "PALLASCA", "POMABAMBA", "RECUAY", "SANTA", "SIHUAS", "YUNGAY"],
  PUNO: ["PUNO", "AZANGARO", "CARABAYA", "CHUCUITO", "EL COLLAO", "HUANCANE", "LAMPA", "MELGAR", "MOHO", "SAN ANTONIO DE PUTINA", "SAN ROMAN", "SANDIA", "YUNGUYO"],
  TACNA: ["TACNA", "CANDARAVE", "JORGE BASADRE", "TARATA"],
  "SAN MARTIN": ["MOYOBAMBA", "BELLAVISTA", "EL DORADO", "HUALLAGA", "LAMAS", "MARISCAL CACERES", "PICOTA", "RIOJA", "SAN MARTIN", "TOCACHE"],
  LORETO: ["MAYNAS", "ALTO AMAZONAS", "LORETO", "MARISCAL RAMON CASTILLA", "REQUENA", "UCAYALI", "DATEM DEL MARAÑON", "PUTUMAYO"],
  UCAYALI: ["CORONEL PORTILLO", "ATALAYA", "PADRE ABAD", "PURUS"],
  CAJAMARCA: ["CAJAMARCA", "CAJABAMBA", "CELENDIN", "CHOTA", "CONTUMAZA", "CUTERVO", "HUALGAYOC", "JAEN", "SAN IGNACIO", "SAN MARCOS", "SAN MIGUEL", "SAN PABLO", "SANTA CRUZ"],
  HUANUCO: ["HUANUCO", "AMBO", "DOS DE MAYO", "HUACAYBAMBA", "HUAMALIES", "LEONCIO PRADO", "MARAÑON", "PACHITEA", "PUERTO INCA", "LAURICOCHA", "YAROWILCA"],
  AYACUCHO: ["HUAMANGA", "CANGALLO", "HUANCA SANCOS", "HUANTA", "LA MAR", "LUCANAS", "PARINACOCHAS", "PAUCAR DEL SARA SARA", "SUCRE", "VICTOR FAJARDO", "VILCAS HUAMAN"],
  AMAZONAS: ["CHACHAPOYAS", "BAGUA", "BONGARA", "CONDORCANQUI", "LUYA", "RODRIGUEZ DE MENDOZA", "UTCUBAMBA"],
  APURIMAC: ["ABANCAY", "ANDAHUAYLAS", "ANTABAMBA", "AYMARAES", "COTABAMBAS", "CHINCHEROS", "GRAU"],
  HUANCAVELICA: ["HUANCAVELICA", "ACOBAMBA", "ANGARAES", "CASTROVIRREYNA", "CHURCAMPA", "HUAYTARA", "TAYACAJA"],
  "MADRE DE DIOS": ["TAMBOPATA", "MANU", "TAHUAMANU"],
  MOQUEGUA: ["MARISCAL NIETO", "GENERAL SANCHEZ CERRO", "ILO"],
  PASCO: ["PASCO", "DANIEL ALCIDES CARRION", "OXAPAMPA"],
  TUMBES: ["TUMBES", "CONTRALMIRANTE VILLAR", "ZARUMILLA"]
};

export const UBIGEO_DISTRICTS = [
  // --- LIMA METROPOLITANA (1501xx) ---
  { district: "LIMA", department: "LIMA", province: "LIMA", ubigeo: "150101", aliases: ["CERCADO DE LIMA", "LIMA CERCADO", "CERCADO"] },
  { district: "ANCON", department: "LIMA", province: "LIMA", ubigeo: "150102", aliases: ["ANCÓN"] },
  { district: "ATE", department: "LIMA", province: "LIMA", ubigeo: "150103", aliases: ["ATE VITARTE", "VITARTE"] },
  { district: "BARRANCO", department: "LIMA", province: "LIMA", ubigeo: "150104", aliases: [] },
  { district: "BREÑA", department: "LIMA", province: "LIMA", ubigeo: "150105", aliases: ["BRENA"] },
  { district: "CARABAYLLO", department: "LIMA", province: "LIMA", ubigeo: "150106", aliases: [] },
  { district: "CHACLACAYO", department: "LIMA", province: "LIMA", ubigeo: "150107", aliases: [] },
  { district: "CHORRILLOS", department: "LIMA", province: "LIMA", ubigeo: "150108", aliases: [] },
  { district: "CIENEGUILLA", department: "LIMA", province: "LIMA", ubigeo: "150109", aliases: [] },
  { district: "COMAS", department: "LIMA", province: "LIMA", ubigeo: "150110", aliases: [] },
  { district: "EL AGUSTINO", department: "LIMA", province: "LIMA", ubigeo: "150111", aliases: ["AGUSTINO"] },
  { district: "INDEPENDENCIA", department: "LIMA", province: "LIMA", ubigeo: "150112", aliases: [] },
  { district: "JESUS MARIA", department: "LIMA", province: "LIMA", ubigeo: "150113", aliases: ["JESÚS MARÍA"] },
  { district: "LA MOLINA", department: "LIMA", province: "LIMA", ubigeo: "150114", aliases: ["MOLINA"] },
  { district: "LA VICTORIA", department: "LIMA", province: "LIMA", ubigeo: "150115", aliases: ["VICTORIA"] },
  { district: "LINCE", department: "LIMA", province: "LIMA", ubigeo: "150116", aliases: [] },
  { district: "LOS OLIVOS", department: "LIMA", province: "LIMA", ubigeo: "150117", aliases: ["OLIVOS"] },
  { district: "LURIGANCHO", department: "LIMA", province: "LIMA", ubigeo: "150118", aliases: ["CHOSICA", "LURIGANCHO CHOSICA", "LURIGANCHO-CHOSICA"] },
  { district: "LURIN", department: "LIMA", province: "LIMA", ubigeo: "150119", aliases: ["LURÍN"] },
  { district: "MAGDALENA DEL MAR", department: "LIMA", province: "LIMA", ubigeo: "150120", aliases: ["MAGDALENA"] },
  { district: "PUEBLO LIBRE", department: "LIMA", province: "LIMA", ubigeo: "150121", aliases: ["MAGDALENA VIEJA"] },
  { district: "MIRAFLORES", department: "LIMA", province: "LIMA", ubigeo: "150122", aliases: [] },
  { district: "PACHACAMAC", department: "LIMA", province: "LIMA", ubigeo: "150123", aliases: ["PACHACÁMAC"] },
  { district: "PUCUSANA", department: "LIMA", province: "LIMA", ubigeo: "150124", aliases: [] },
  { district: "PUENTE PIEDRA", department: "LIMA", province: "LIMA", ubigeo: "150125", aliases: [] },
  { district: "PUNTA HERMOSA", department: "LIMA", province: "LIMA", ubigeo: "150126", aliases: [] },
  { district: "PUNTA NEGRA", department: "LIMA", province: "LIMA", ubigeo: "150127", aliases: [] },
  { district: "RIMAC", department: "LIMA", province: "LIMA", ubigeo: "150128", aliases: ["RÍMAC"] },
  { district: "SAN BARTOLO", department: "LIMA", province: "LIMA", ubigeo: "150129", aliases: [] },
  { district: "SAN BORJA", department: "LIMA", province: "LIMA", ubigeo: "150130", aliases: [] },
  { district: "SAN ISIDRO", department: "LIMA", province: "LIMA", ubigeo: "150131", aliases: [] },
  { district: "SAN JUAN DE LURIGANCHO", department: "LIMA", province: "LIMA", ubigeo: "150132", aliases: ["SJL"] },
  { district: "SAN JUAN DE MIRAFLORES", department: "LIMA", province: "LIMA", ubigeo: "150133", aliases: ["SJM"] },
  { district: "SAN LUIS", department: "LIMA", province: "LIMA", ubigeo: "150134", aliases: [] },
  { district: "SAN MARTIN DE PORRES", department: "LIMA", province: "LIMA", ubigeo: "150135", aliases: ["SAN MARTÍN DE PORRES", "SMP"] },
  { district: "SAN MIGUEL", department: "LIMA", province: "LIMA", ubigeo: "150136", aliases: [] },
  { district: "SANTA ANITA", department: "LIMA", province: "LIMA", ubigeo: "150137", aliases: [] },
  { district: "SANTA MARIA DEL MAR", department: "LIMA", province: "LIMA", ubigeo: "150138", aliases: ["SANTA MARÍA DEL MAR"] },
  { district: "SANTA ROSA", department: "LIMA", province: "LIMA", ubigeo: "150139", aliases: [] },
  { district: "SANTIAGO DE SURCO", department: "LIMA", province: "LIMA", ubigeo: "150140", aliases: ["SURCO"] },
  { district: "SURQUILLO", department: "LIMA", province: "LIMA", ubigeo: "150141", aliases: [] },
  { district: "VILLA EL SALVADOR", department: "LIMA", province: "LIMA", ubigeo: "150142", aliases: ["VES"] },
  { district: "VILLA MARIA DEL TRIUNFO", department: "LIMA", province: "LIMA", ubigeo: "150143", aliases: ["VILLA MARÍA DEL TRIUNFO", "VMT"] },

  // --- CALLAO (0701xx) ---
  { district: "CALLAO", department: "CALLAO", province: "CALLAO", ubigeo: "070101", aliases: ["CERCADO DEL CALLAO", "CALLAO CERCADO"] },
  { district: "BELLAVISTA", department: "CALLAO", province: "CALLAO", ubigeo: "070102", aliases: [] },
  { district: "CARMEN DE LA LEGUA REYNOSO", department: "CALLAO", province: "CALLAO", ubigeo: "070103", aliases: ["CARMEN DE LA LEGUA"] },
  { district: "LA PERLA", department: "CALLAO", province: "CALLAO", ubigeo: "070104", aliases: [] },
  { district: "LA PUNTA", department: "CALLAO", province: "CALLAO", ubigeo: "070105", aliases: [] },
  { district: "VENTANILLA", department: "CALLAO", province: "CALLAO", ubigeo: "070106", aliases: [] },
  { district: "MI PERU", department: "CALLAO", province: "CALLAO", ubigeo: "070107", aliases: ["MI PERÚ"] },

  // --- PRINCIPALES CIUDADES Y PROVINCIAS ---
  { district: "AREQUIPA", department: "AREQUIPA", province: "AREQUIPA", ubigeo: "040101", aliases: ["CERCADO AREQUIPA"] },
  { district: "TRUJILLO", department: "LA LIBERTAD", province: "TRUJILLO", ubigeo: "130101", aliases: ["CERCADO TRUJILLO"] },
  { district: "CHICLAYO", department: "LAMBAYEQUE", province: "CHICLAYO", ubigeo: "140101", aliases: ["CERCADO CHICLAYO"] },
  { district: "PIURA", department: "PIURA", province: "PIURA", ubigeo: "200101", aliases: ["CERCADO PIURA"] },
  { district: "HUANCAYO", department: "JUNIN", province: "HUANCAYO", ubigeo: "120101", aliases: ["CERCADO HUANCAYO"] },
  { district: "CUSCO", department: "CUSCO", province: "CUSCO", ubigeo: "080101", aliases: ["CUZCO"] },
  { district: "ICA", department: "ICA", province: "ICA", ubigeo: "110101", aliases: ["CERCADO ICA"] },
  { district: "CHIMBOTE", department: "ANCASH", province: "SANTA", ubigeo: "021801", aliases: [] },
  { district: "NUEVO CHIMBOTE", department: "ANCASH", province: "SANTA", ubigeo: "021809", aliases: [] },
  { district: "JULIACA", department: "PUNO", province: "SAN ROMAN", ubigeo: "211101", aliases: ["SAN ROMÁN"] },
  { district: "PUNO", department: "PUNO", province: "PUNO", ubigeo: "210101", aliases: [] },
  { district: "TACNA", department: "TACNA", province: "TACNA", ubigeo: "230101", aliases: [] },
  { district: "TARAPOTO", department: "SAN MARTIN", province: "SAN MARTIN", ubigeo: "220901", aliases: [] },
  { district: "IQUITOS", department: "LORETO", province: "MAYNAS", ubigeo: "160101", aliases: [] },
  { district: "PUCALLPA", department: "UCAYALI", province: "CORONEL PORTILLO", ubigeo: "250101", aliases: [] },
  { district: "CAJAMARCA", department: "CAJAMARCA", province: "CAJAMARCA", ubigeo: "060101", aliases: [] },
  { district: "HUANUCO", department: "HUANUCO", province: "HUANUCO", ubigeo: "100101", aliases: ["HUÁNUCO"] },
  { district: "AYACUCHO", department: "AYACUCHO", province: "HUAMANGA", ubigeo: "050101", aliases: ["HUAMANGA"] }
];

/**
 * Normaliza una cadena eliminando tildes y espacios dobles
 */
export function normalizeString(str) {
  if (!str) return "";
  return str
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Obtiene las provincias correspondientes a un departamento (por nombre o código SAP)
 */
export function getProvincesByDepartment(departmentNameOrCode) {
  if (!departmentNameOrCode) return [];
  let name = departmentNameOrCode;
  if (/^\d{1,2}$/.test(String(departmentNameOrCode).trim())) {
    const deptObj = getDepartmentByCode(departmentNameOrCode);
    if (deptObj) name = deptObj.name;
  }
  const cleanDept = normalizeString(name);
  for (const [dept, provs] of Object.entries(PERU_PROVINCES_BY_DEPT)) {
    if (normalizeString(dept) === cleanDept) {
      return provs;
    }
  }
  return [String(name).toUpperCase()];
}

/**
 * Busca el Ubigeo y datos geográficos correspondientes a un distrito ingresado
 * @param {string} inputDistrict Nombre del distrito o alias
 * @returns {object|null} { district, department, province, ubigeo, departmentCode }
 */
export function getUbigeoByDistrict(inputDistrict) {
  if (!inputDistrict) return null;
  const cleanInput = normalizeString(inputDistrict);
  if (!cleanInput) return null;

  for (const item of UBIGEO_DISTRICTS) {
    let matched = false;
    if (normalizeString(item.district) === cleanInput) {
      matched = true;
    } else {
      for (const alias of item.aliases) {
        if (normalizeString(alias) === cleanInput) {
          matched = true;
          break;
        }
      }
    }
    if (matched) {
      const code = item.ubigeo ? item.ubigeo.slice(0, 2) : "15";
      const deptObj = getDepartmentByCode(code) || getDepartmentByName(item.department);
      return {
        ...item,
        departmentCode: deptObj ? deptObj.code : code,
        department: deptObj ? deptObj.name : item.department,
      };
    }
  }

  return null;
}

