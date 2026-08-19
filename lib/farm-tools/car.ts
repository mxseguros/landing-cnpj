import { areaHectares, caixa, centro, type GeometriaPoligono } from './geometria';
import municipiosChunks from './municipios-chunks.json';

/**
 * Consulta de imóvel rural pelo código do CAR (Cadastro Ambiental Rural).
 *
 * Porte para TypeScript do `services/car_service.py` do FARM tools (ver README
 * desta pasta). A busca original é em dois passos contra o índice estático
 * público em S3:
 *
 *   1. `stem_index_{UF}.json` — mapeia código do CAR → arquivo de chunk;
 *   2. `chunks/chunk_{X}_{Y}.geojson` — FeatureCollection com a geometria.
 *
 * O passo 1 não sobrevive à web. No QGIS o índice é baixado e passado por
 * `json.loads` de uma vez, e o usuário aceita esperar; aqui `stem_index_SP.json`
 * tem 37 MB e um código de Itapira só aparece depois de 33 MB de leitura —
 * dez segundos com o produtor olhando para um spinner.
 *
 * Por isso a rota rápida é `municipios-chunks.json`, gerado por
 * `gerar-indice.mjs`: o código do CAR já carrega o código IBGE do município, e
 * um município é coberto por poucas células da grade (Itapira, por duas). A
 * varredura em streaming do índice original continua aqui como retaguarda, para
 * UF fora do arquivo gerado e para chunk publicado depois da última geração.
 *
 * Roda só no servidor: o bucket não devolve CORS e o índice é grande demais
 * para o navegador do produtor, que muitas vezes está no 4G da fazenda.
 */

const BASE_S3 =
  'https://dados-car-963200076509-us-east-2-an.s3.us-east-2.amazonaws.com/local_chunks/area_overlay';

/** UF-IBGE-HEX32, ex.: SP-3544251-896FFEEE29054E55B77526229C07E997 */
const CODIGO_CAR = /^[A-Z]{2}-\d+-[0-9A-F]{32}$/;

/** Entrada do índice do registro: `"CODIGO":"chunks/chunk_X_Y.geojson"`. */
const ENTRADA_INDICE = /"([A-Z]{2}-\d+-[0-9A-F]+)"\s*:\s*"(chunks\/chunk_-?\d+_-?\d+\.geojson)"/g;

/** Recorte mantido entre blocos do stream para não perder entrada partida ao meio. */
const SOBRA_STREAM = 256;

/** Chunks baixados de uma vez na rota rápida — segura a banda sem serializar tudo. */
const LOTE_CHUNKS = 4;

const TEMPO_LIMITE_MS = 25_000;

/** Município IBGE → células da grade que o cobrem. Ver `gerar-indice.mjs`. */
const INDICE_MUNICIPIOS = municipiosChunks as Record<string, string[]>;

export type MotivoErroCar =
  | 'codigo_invalido'
  | 'uf_sem_indice'
  | 'nao_encontrado'
  | 'indisponivel';

export class ErroCar extends Error {
  constructor(readonly motivo: MotivoErroCar, mensagem: string) {
    super(mensagem);
    this.name = 'ErroCar';
  }
}

export interface ImovelCar {
  codigo: string;
  uf: string;
  municipio: string;
  /** Área calculada a partir do contorno — o registro não publica o valor. */
  hectares: number;
  /** Situação do cadastro, ex.: "Aguardando analise". */
  condicao?: string;
  /** Tipo do imóvel por extenso (rural, assentamento, comunidade tradicional). */
  tipo?: string;
  geometria: GeometriaPoligono;
  centro: { lat: number; lon: number };
  caixa: { oeste: number; sul: number; leste: number; norte: number };
}

const TIPO_IMOVEL: Record<string, string> = {
  IRU: 'Imóvel rural',
  AST: 'Assentamento de reforma agrária',
  PCT: 'Povos e comunidades tradicionais',
};

export function normalizarCodigo(codigo: string): string {
  return (codigo ?? '').trim().toUpperCase();
}

export function ehCodigoValido(codigo: string): boolean {
  return CODIGO_CAR.test(normalizarCodigo(codigo));
}

/** Resolve o código do CAR no contorno do imóvel, com área e município. */
export async function consultarCar(codigoBruto: string): Promise<ImovelCar> {
  const codigo = normalizarCodigo(codigoBruto);
  if (!ehCodigoValido(codigo)) {
    throw new ErroCar(
      'codigo_invalido',
      'Código do CAR fora do formato esperado (ex.: SP-3544251-896FFEEE29054E55B77526229C07E997).',
    );
  }

  // Município conhecido e imóvel ausente das células dele é digitação errada,
  // não lacuna do índice gerado: as células cobrem a área do município inteiro,
  // então um imóvel novo cai numa que já existe. Varrer os 37 MB para confirmar
  // custaria 15 s para dizer "não achei" a quem só errou um dígito do hexa.
  const feicao =
    (await buscarPeloMunicipio(codigo)) ??
    (municipioConhecido(codigo) ? undefined : await buscarVarrendoIndice(codigo));

  if (!feicao) {
    throw new ErroCar(
      'nao_encontrado',
      'Este código não aparece no registro do CAR. Confira os dígitos e tente de novo.',
    );
  }
  if (!feicao.geometry?.coordinates?.length) {
    throw new ErroCar('nao_encontrado', 'A geometria deste imóvel não está publicada no registro.');
  }

  const propriedades = feicao.properties ?? {};
  const geometria = feicao.geometry;

  return {
    codigo,
    uf: codigo.slice(0, 2),
    municipio: String(propriedades.municipio ?? '').trim(),
    hectares: areaHectares(geometria),
    condicao: propriedades.des_condic ? String(propriedades.des_condic) : undefined,
    tipo: TIPO_IMOVEL[String(propriedades.ind_tipo ?? '')],
    geometria,
    centro: centro(geometria),
    caixa: caixa(geometria),
  };
}

/**
 * Rota rápida: as células do município saem do índice gerado, e só elas são
 * baixadas. Devolve `undefined` quando o município não está no arquivo ou o
 * imóvel não está nas células conhecidas — os dois casos caem na retaguarda.
 */
function municipioConhecido(codigo: string): boolean {
  return Boolean(INDICE_MUNICIPIOS[codigo.split('-')[1]]?.length);
}

async function buscarPeloMunicipio(codigo: string): Promise<Feicao | undefined> {
  const celulas = INDICE_MUNICIPIOS[codigo.split('-')[1]];
  if (!celulas?.length) return undefined;

  for (let i = 0; i < celulas.length; i += LOTE_CHUNKS) {
    const lote = await Promise.all(
      celulas.slice(i, i + LOTE_CHUNKS).map((c) => baixarChunk(`chunks/chunk_${c}.geojson`)),
    );
    for (const chunk of lote) {
      const feicao = acharFeicao(chunk, codigo);
      if (feicao) return feicao;
    }
  }
  return undefined;
}

/**
 * Retaguarda: varre `stem_index_{UF}.json` em streaming até achar o código.
 *
 * A leitura é abandonada no primeiro acerto. É lenta por natureza — só chega
 * aqui quem está fora do índice gerado.
 */
async function buscarVarrendoIndice(codigo: string): Promise<Feicao | undefined> {
  const uf = codigo.slice(0, 2);
  const resposta = await buscar(`${BASE_S3}/stem_index_${uf}.json`);

  if (resposta.status === 404) {
    throw new ErroCar('uf_sem_indice', `Não há registro publicado para o estado ${uf}.`);
  }
  if (!resposta.ok || !resposta.body) {
    throw new ErroCar('indisponivel', 'O registro do CAR não respondeu agora.');
  }

  // O código pode ser prefixo de uma chave mais longa — o índice guarda o
  // "stem" do imóvel, e o serviço de origem também aceita o casamento por
  // prefixo. Sem isso, códigos válidos dariam "não encontrado".
  const casa = (chave: string) => chave === codigo || chave.startsWith(codigo);

  const leitor = resposta.body.getReader();
  const decodificador = new TextDecoder();
  let restante = '';
  let arquivo: string | undefined;

  try {
    while (!arquivo) {
      // Estouro do tempo limite aborta a leitura no meio; sem este catch o erro
      // sairia cru como 500 em vez da mensagem de indisponibilidade.
      const { done, value } = await leitor.read().catch(() => {
        throw new ErroCar('indisponivel', 'A consulta ao registro do CAR demorou demais.');
      });
      if (done) break;

      restante += decodificador.decode(value, { stream: true });

      let fimUltima = 0;
      ENTRADA_INDICE.lastIndex = 0;
      for (let m = ENTRADA_INDICE.exec(restante); m; m = ENTRADA_INDICE.exec(restante)) {
        fimUltima = m.index + m[0].length;
        if (casa(m[1])) {
          arquivo = m[2];
          break;
        }
      }

      // Descarta o que já foi lido e segura só a cauda, onde pode haver uma
      // entrada cortada na fronteira do bloco.
      restante = restante.slice(Math.max(fimUltima, restante.length - SOBRA_STREAM));
    }
  } finally {
    await leitor.cancel().catch(() => {});
  }

  if (!arquivo) {
    throw new ErroCar(
      'nao_encontrado',
      'Este código não aparece no registro do CAR para o estado informado.',
    );
  }
  return acharFeicao(await baixarChunk(arquivo), codigo);
}

type Feicao = {
  geometry?: GeometriaPoligono;
  properties?: Record<string, unknown>;
};

/**
 * Chunks têm poucas centenas de KB e mudam raramente — cabem no cache do fetch
 * do Next, então o segundo produtor da mesma região nem sai da Vercel.
 */
async function baixarChunk(arquivo: string): Promise<{ features?: Feicao[] }> {
  const resposta = await buscar(`${BASE_S3}/${arquivo}`, { next: { revalidate: 86_400 } });
  if (!resposta.ok) {
    throw new ErroCar('indisponivel', 'Não consegui baixar o contorno da propriedade agora.');
  }
  return resposta.json();
}

function acharFeicao(chunk: { features?: Feicao[] }, codigo: string): Feicao | undefined {
  return (chunk.features ?? []).find((f) => {
    const p = f.properties ?? {};
    const id = String(p.cod_imovel ?? p.unavailable_id ?? '').trim().toUpperCase();
    return id === codigo;
  });
}

/** Um S3 fora do ar não pode deixar a rota pendurada até o teto da função. */
async function buscar(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
  } catch {
    throw new ErroCar('indisponivel', 'O registro do CAR não respondeu agora.');
  }
}
