// data.js - VERSÃO COMPLETA E CORRIGIDA
const ftp = require('basic-ftp');
const unzipper = require('unzipper');
const { DBFFile } = require('dbffile');
const { PassThrough } = require('stream');

let caData = new Map();
let isDataReady = false;
let isCurrentlyLoading = false;

async function loadData() {
  if (isCurrentlyLoading) return;
  isCurrentlyLoading = true;
  isDataReady = false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const client = new ftp.Client();
    try {
      console.log(`[DADOS] Iniciando carregamento (Tentativa ${attempt}/3)...`);
      await client.access({ host: "ftp.mtps.gov.br" });
      console.log('[DADOS] Conectado ao servidor FTP.');

      console.log('[DADOS] Passo 1/4: Baixando o arquivo .zip...');
      const writable = new PassThrough();
      await client.downloadTo(writable, "caepi/tgg_export_caepi.zip");
      console.log('[DADOS] Passo 1/4: Download concluído com sucesso.');
      
      const buffer = await streamToBuffer(writable);

      console.log('[DADOS] Passo 2/4: Procurando pelo arquivo .dbf...');
      const directory = await unzipper.Open.buffer(buffer);
      const dbfFile = directory.files.find(file => file.path.toLowerCase().endsWith('.dbf'));

      if (!dbfFile) throw new Error('Nenhum arquivo .dbf encontrado dentro do .zip.');
      console.log(`[DADOS] Passo 2/4: Arquivo encontrado: ${dbfFile.path}`);
      
      console.log('[DADOS] Passo 3/4: Lendo e processando o arquivo .dbf...');
      const dbfContent = await dbfFile.buffer();
      const dbf = await DBFFile.open(dbfContent);
      
      const records = await dbf.readRecords();
      caData.clear();
      for (const record of records) {
        const caNumber = String(record.NR_CA).trim();
        caData.set(caNumber, record);
      }
      
      console.log(`[DADOS] Passo 3/4: Processamento concluído. ${caData.size} registros carregados.`);
      isDataReady = true;
      console.log('[DADOS] Passo 4/4: A base de dados está PRONTA para consultas!');
      
      isCurrentlyLoading = false;
      client.close();
      return; 

    } catch (error) {
      console.error(`[DADOS] ERRO na Tentativa ${attempt}:`, error.message);
      isDataReady = false; 
      if (attempt < 3) {
        console.log('[DADOS] Aguardando 10 segundos antes de tentar novamente...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } finally {
      if (!client.closed) {
        client.close();
      }
    }
  }

  console.error('[DADOS] ERRO FATAL: Não foi possível carregar a base de dados após 3 tentativas.');
  isCurrentlyLoading = false;
}

function getCAInfo(caNumber) {
  if (!isDataReady) {
    return { error: 'A base de dados ainda está a ser carregada ou falhou no carregamento. Por favor, tente novamente mais tarde.' };
  }
  const caInfo = caData.get(String(caNumber).trim());
  if (caInfo) {
    return {
      'Nº do CA': caInfo.NR_CA,
      'Data de Validade': caInfo.DT_VALIDADE,
      'Situação': caInfo.DS_SITUACAO,
      'Equipamento': caInfo.DS_EQUIPAMENTO,
      'Fabricante': caInfo.NO_FABRICANTE
    };
  } else {
    return { error: `O CA "${caNumber}" não foi encontrado na base de dados.` };
  }
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = { getCAInfo, loadData };