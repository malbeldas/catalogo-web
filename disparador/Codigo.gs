/* Disparador de la tarea respaldo (SPEC.md §4, AC-010-6). Corre en Google Apps Script, en la cuenta del vendedor,
   y cada 15 minutos le pide a GitHub correr respaldo en el repo de cada cliente: el cron de GitHub casi no corre solo.
   Se configura en las propiedades del script (Configuración del proyecto > Propiedades del script), nunca en un repo:
   - CLIENTES: un repo por línea, como cuenta/repo (también separados por comas).
   - TOKEN_<cuenta>: un token de grano fino de GitHub con permiso Actions (lectura y escritura) en los repos de esa cuenta.
   Se instala corriendo instalar() una vez desde el editor. Pasos en ALTA.md, "Disparador". Vive solo en la base. */

const TAREA = 'respaldo.yml';
const RAMA = 'main';
const CADA_MINUTOS = 15;

// Los repos de CLIENTES, en orden y sin repetir. Una línea que no es cuenta/repo es un error, no se saltea.
function leerClientes(texto) {
  const repos = [], errores = [];
  for (const linea of String(texto || '').split(/[\n,]/).map(l => l.trim()).filter(Boolean)) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(linea)) errores.push(`"${linea}" no es un repo (cuenta/repo)`);
    else if (!repos.includes(linea)) repos.push(linea);
  }
  return { repos, errores };
}

// Pide respaldo en cada cliente. Un cliente con error no corta a los demás: los errores se juntan y la corrida
// falla al final, así Google le manda el mail al dueño del script con lo que pasó.
function disparar() {
  const props = PropertiesService.getScriptProperties();
  const { repos, errores } = leerClientes(props.getProperty('CLIENTES'));
  if (!repos.length && !errores.length) errores.push('La propiedad CLIENTES está vacía: no hay ningún cliente para actualizar');
  for (const repo of repos) {
    const cuenta = repo.split('/')[0];
    const token = props.getProperty(`TOKEN_${cuenta}`);
    if (!token) { errores.push(`${repo}: falta la propiedad TOKEN_${cuenta}`); continue; }
    try {
      const r = UrlFetchApp.fetch(`https://api.github.com/repos/${repo}/actions/workflows/${TAREA}/dispatches`, {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        payload: JSON.stringify({ ref: RAMA }),
        muteHttpExceptions: true,
      });
      const codigo = r.getResponseCode();
      if (codigo < 200 || codigo >= 300) errores.push(`${repo}: GitHub respondió ${codigo}${explicar(codigo)}`);
    } catch (e) {
      errores.push(`${repo}: ${e.message}`);
    }
  }
  if (errores.length) throw new Error(`No se pudo pedir la actualización de ${errores.length} cliente(s):\n${errores.join('\n')}`);
  console.log(`Actualización pedida para ${repos.length} cliente(s).`);
  return repos.length;
}

function explicar(codigo) {
  if (codigo === 401) return ' (el token venció o es incorrecto: hay que renovarlo)';
  if (codigo === 403) return ' (el token no tiene permiso de Actions en este repo)';
  if (codigo === 404) return ' (no existe el repo, la tarea respaldo o el token no llega a ese repo)';
  return '';
}

// Una sola vez, desde el editor: deja un disparador cada 15 minutos (sin duplicarlo) y hace la primera corrida,
// así un error de configuración se ve en el registro en el momento.
function instalar() {
  for (const t of ScriptApp.getProjectTriggers()) if (t.getHandlerFunction() === 'disparar') ScriptApp.deleteTrigger(t);
  ScriptApp.newTrigger('disparar').timeBased().everyMinutes(CADA_MINUTOS).create();
  return disparar();
}
