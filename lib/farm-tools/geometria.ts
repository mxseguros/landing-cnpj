/**
 * Geometria de polígono do CAR — área, enquadramento e desenho.
 *
 * O CAR devolve o contorno do imóvel em GeoJSON (WGS84, graus decimais) e não
 * informa a área. Como área é justamente o dado que interessa para a cotação
 * rural, ela é calculada aqui a partir do próprio contorno.
 *
 * Nada aqui depende de biblioteca de mapa: a landing precisa de um número e de
 * um desenho, não de tiles, e qualquer dependência de mapa custaria mais
 * JavaScript no cliente do que a seção inteira.
 */

/** Raio médio da Terra (IUGG), em metros. */
const RAIO_TERRA_M = 6_371_008.8;

/** Anel de coordenadas [longitude, latitude] em graus decimais. */
export type Anel = [number, number][];

export type GeometriaPoligono =
  | { type: 'Polygon'; coordinates: Anel[] }
  | { type: 'MultiPolygon'; coordinates: Anel[][] };

export type Caixa = { oeste: number; sul: number; leste: number; norte: number };

/** Todos os polígonos da geometria, como lista de anéis (externo + buracos). */
function poligonos(g: GeometriaPoligono): Anel[][] {
  return g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
}

const rad = (graus: number) => (graus * Math.PI) / 180;

/**
 * Área de um anel sobre a esfera, em m² (Chamberlain & Duquette).
 *
 * O sinal indica a orientação do anel, e é ignorado por quem chama: o CAR não
 * garante mão dos anéis, então o externo é tomado em módulo e os buracos são
 * subtraídos explicitamente pela posição no array, como manda o GeoJSON.
 *
 * O modelo esférico erra da ordem de 0,3% contra o elipsoide. Numa propriedade
 * de 100 ha isso dá 30 ares — irrelevante para dimensionar a cotação, e o número
 * é apresentado como aproximado justamente por isso.
 */
function areaAnelM2(anel: Anel): number {
  if (anel.length < 3) return 0;
  let soma = 0;
  for (let i = 0; i < anel.length; i++) {
    const [lonA, latA] = anel[i];
    const [lonB, latB] = anel[(i + 1) % anel.length];
    soma += rad(lonB - lonA) * (2 + Math.sin(rad(latA)) + Math.sin(rad(latB)));
  }
  return (soma * RAIO_TERRA_M * RAIO_TERRA_M) / 2;
}

/** Área do imóvel em hectares, descontados os buracos dos anéis internos. */
export function areaHectares(g: GeometriaPoligono): number {
  let m2 = 0;
  for (const aneis of poligonos(g)) {
    m2 += Math.abs(areaAnelM2(aneis[0] ?? []));
    for (const buraco of aneis.slice(1)) m2 -= Math.abs(areaAnelM2(buraco));
  }
  return Math.max(m2, 0) / 10_000;
}

export function caixa(g: GeometriaPoligono): Caixa {
  let oeste = Infinity, sul = Infinity, leste = -Infinity, norte = -Infinity;
  for (const aneis of poligonos(g)) {
    for (const [lon, lat] of aneis[0] ?? []) {
      if (lon < oeste) oeste = lon;
      if (lon > leste) leste = lon;
      if (lat < sul) sul = lat;
      if (lat > norte) norte = lat;
    }
  }
  return { oeste, sul, leste, norte };
}

/** Centro da caixa envolvente — serve para link de mapa, não para cálculo. */
export function centro(g: GeometriaPoligono): { lat: number; lon: number } {
  const c = caixa(g);
  return { lat: (c.sul + c.norte) / 2, lon: (c.oeste + c.leste) / 2 };
}

/**
 * Contorno do imóvel como lista de caminhos SVG, já enquadrados em `lado`×`lado`.
 *
 * A longitude é comprimida por cos(latitude) antes de escalar: sem isso, uma
 * propriedade a 22°S apareceria ~8% mais larga do que é, e o produtor não
 * reconheceria o formato do próprio talhão — que é a única função do desenho.
 */
export function caminhosSvg(g: GeometriaPoligono, lado: number, margem = 4): string[] {
  const c = caixa(g);
  const escalaLon = Math.cos(rad((c.sul + c.norte) / 2)) || 1;
  const larguraGraus = (c.leste - c.oeste) * escalaLon;
  const alturaGraus = c.norte - c.sul;
  const util = lado - margem * 2;
  // Uma propriedade degenerada (contorno de área zero) dividiria por zero aqui.
  const escala = util / Math.max(larguraGraus, alturaGraus, 1e-9);
  const deslocaX = margem + (util - larguraGraus * escala) / 2;
  const deslocaY = margem + (util - alturaGraus * escala) / 2;

  const ponto = ([lon, lat]: [number, number]) => {
    const x = deslocaX + (lon - c.oeste) * escalaLon * escala;
    // O eixo Y do SVG cresce para baixo; a latitude, para cima.
    const y = deslocaY + (c.norte - lat) * escala;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };

  const caminhos: string[] = [];
  for (const aneis of poligonos(g)) {
    for (const anel of aneis) {
      if (anel.length < 3) continue;
      const pontos = anel.map(ponto).filter(descartaVizinhoColado());
      if (pontos.length < 3) continue;
      caminhos.push(`M${pontos.join('L')}Z`);
    }
  }
  return caminhos;
}

/**
 * Filtro que descarta vértices a menos de meio pixel do anterior.
 *
 * Contorno do CAR é levantamento de campo: propriedades grandes chegam com
 * milhares de vértices, que num desenho de 100 px viram bytes trafegados para
 * pintar o mesmo pixel duas vezes. O primeiro ponto nunca é descartado, senão
 * o caminho perde o `M`.
 */
function descartaVizinhoColado(minimo = 0.5) {
  let anterior: [number, number] | undefined;
  return (ponto: string) => {
    const [x, y] = ponto.split(',').map(Number) as [number, number];
    if (anterior && Math.abs(x - anterior[0]) < minimo && Math.abs(y - anterior[1]) < minimo) {
      return false;
    }
    anterior = [x, y];
    return true;
  };
}
