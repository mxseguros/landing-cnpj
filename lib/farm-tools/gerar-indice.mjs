/**
 * Gera `municipios-chunks.json` — o atalho que evita varrer o índice do CAR.
 *
 *   node lib/farm-tools/gerar-indice.mjs SP MG
 *
 * O índice do registro (`stem_index_{UF}.json`) mapeia imóvel → chunk e tem
 * dezenas de MB: 37 MB em SP, e um código de Itapira só aparece depois de 33 MB
 * de leitura, o que dá ~10 s de espera para o produtor. Este script inverte a
 * chave uma vez: município → chunks que o cobrem. O resultado do estado de São
 * Paulo inteiro cabe em ~70 KB porque um município é coberto por poucas células
 * da grade — Itapira, por duas.
 *
 * Rode de novo quando o registro publicar chunks novos. Não é obrigatório: um
 * código fora do arquivo cai na varredura em streaming do `car.ts`, que continua
 * funcionando — o atalho é desempenho, não correção.
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE_S3 =
  'https://dados-car-963200076509-us-east-2-an.s3.us-east-2.amazonaws.com/local_chunks/area_overlay';

/** `"UF-IBGE-HEX":"chunks/chunk_X_Y.geojson"` — captura o IBGE e a célula. */
const ENTRADA = /"[A-Z]{2}-(\d+)-[0-9A-F]+"\s*:\s*"chunks\/chunk_(-?\d+_-?\d+)\.geojson"/g;
const SOBRA = 256;

const ufs = process.argv.slice(2).map((uf) => uf.toUpperCase());
if (ufs.length === 0) {
  console.error('Uso: node lib/farm-tools/gerar-indice.mjs SP MG');
  process.exit(1);
}

const porMunicipio = new Map();

for (const uf of ufs) {
  const inicio = Date.now();
  const resposta = await fetch(`${BASE_S3}/stem_index_${uf}.json`);
  if (!resposta.ok) {
    console.error(`${uf}: índice indisponível (HTTP ${resposta.status})`);
    process.exit(1);
  }

  const leitor = resposta.body.getReader();
  const decodificador = new TextDecoder();
  let restante = '';
  let imoveis = 0;
  let bytes = 0;

  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    bytes += value.length;
    restante += decodificador.decode(value, { stream: true });

    let fimUltima = 0;
    ENTRADA.lastIndex = 0;
    for (let m = ENTRADA.exec(restante); m; m = ENTRADA.exec(restante)) {
      const [, ibge, celula] = m;
      fimUltima = m.index + m[0].length;
      imoveis++;
      let celulas = porMunicipio.get(ibge);
      if (!celulas) porMunicipio.set(ibge, (celulas = new Set()));
      celulas.add(celula);
    }
    restante = restante.slice(Math.max(fimUltima, restante.length - SOBRA));
  }

  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log(`${uf}: ${(bytes / 1e6).toFixed(1)} MB · ${imoveis} imóveis · ${segundos}s`);
}

// Ordenado para o arquivo não mudar de forma entre execuções — diff de
// regeração mostra município novo, não reordenação.
const saida = Object.fromEntries(
  [...porMunicipio].sort(([a], [b]) => a.localeCompare(b)).map(([ibge, celulas]) => [ibge, [...celulas].sort()]),
);

const destino = fileURLToPath(new URL('./municipios-chunks.json', import.meta.url));
await writeFile(destino, JSON.stringify(saida) + '\n', 'utf8');

const total = Object.values(saida).reduce((s, c) => s + c.length, 0);
console.log(
  `municipios-chunks.json: ${Object.keys(saida).length} municípios · ${total} chunks · ` +
    `${(JSON.stringify(saida).length / 1024).toFixed(0)} KB`,
);
