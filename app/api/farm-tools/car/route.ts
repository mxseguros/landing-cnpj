import { consultarCar, ErroCar, caminhosSvg, type MotivoErroCar } from '@/lib/farm-tools';

/**
 * Consulta do CAR para a solicitação de orçamento do agro.
 *
 * A rota existe porque o registro é servido por um bucket sem CORS e com
 * índices de dezenas de MB — nada disso pode acontecer no navegador de quem
 * está no 4G da fazenda. Aqui entra código, sai propriedade resumida.
 *
 * O contorno sai daqui já como caminho SVG: quem consome quer desenhar o
 * formato do talhão para o produtor reconhecer, não fazer geoprocessamento, e
 * mandar polígono cru custaria dezenas de KB e uma biblioteca de mapa no
 * cliente para chegar ao mesmo desenho.
 */

/** Lado do quadro em que o contorno é enquadrado — o mesmo do viewBox no cliente. */
const LADO_DESENHO = 100;

const STATUS: Record<MotivoErroCar, number> = {
  codigo_invalido: 400,
  uf_sem_indice: 404,
  nao_encontrado: 404,
  indisponivel: 503,
};

export async function GET(req: Request) {
  const codigo = new URL(req.url).searchParams.get('codigo') ?? '';

  try {
    const imovel = await consultarCar(codigo);
    return Response.json(
      {
        codigo: imovel.codigo,
        uf: imovel.uf,
        municipio: imovel.municipio,
        // Uma casa decimal. O cálculo é esférico e o contorno é do cadastro,
        // não da matrícula: passar disso seria fingir precisão que não existe.
        hectares: Number(imovel.hectares.toFixed(1)),
        condicao: imovel.condicao,
        tipo: imovel.tipo,
        contorno: caminhosSvg(imovel.geometria, LADO_DESENHO),
        centro: imovel.centro,
      },
      {
        // O contorno de um imóvel não muda de uma semana para a outra, e a
        // consulta é sempre a mesma URL — vale cache de CDN.
        headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' },
      },
    );
  } catch (erro) {
    if (erro instanceof ErroCar) {
      return Response.json({ erro: erro.message, motivo: erro.motivo }, { status: STATUS[erro.motivo] });
    }
    console.error('[car]', codigo, erro);
    return Response.json({ erro: 'Falha ao consultar o registro.', motivo: 'indisponivel' }, { status: 500 });
  }
}
