// data.js - CÓDIGO DE DIAGNÓSTICO PARA LISTAR ARQUIVOS
const ftp = require('basic-ftp');

async function loadData() {
  console.log('[DIAGNÓSTICO] Iniciando teste de conexão e listagem de arquivos...');
  const client = new ftp.Client();
  try {
    await client.access({ host: "ftp.mtps.gov.br" });
    console.log('[DIAGNÓSTICO] Conectado ao servidor FTP com sucesso.');

    console.log('[DIAGNÓSTICO] Pedindo a lista de arquivos e pastas do diretório inicial...');
    const list = await client.list();
    
    console.log('--- INÍCIO DA LISTA DE ARQUIVOS DO SERVIDOR ---');
    console.dir(list, {'maxArrayLength': null}); // Mostra a lista completa
    console.log('--- FIM DA LISTA DE ARQUIVOS DO SERVIDOR ---');

  } catch (error) {
    console.error('[DIAGNÓSTICO] ERRO:', error);
  } finally {
    client.close();
    console.log('[DIAGNÓSTICO] Teste finalizado. Verifique a lista de arquivos acima.');
  }
}

function getCAInfo(caNumber) {
  // Apenas uma resposta padrão durante o teste
  return { error: 'Robô em modo de diagnóstico. Verifique os logs do Render.' };
}

module.exports = { getCAInfo, loadData };