/**
 * Superfície pública do porte do FARM tools. Ver README.md desta pasta.
 *
 * `consultarCar` só roda no servidor (o bucket não devolve CORS e o índice é
 * grande demais para o cliente); o resto é puro e serve aos dois lados.
 */

export { consultarCar, ehCodigoValido, normalizarCodigo, ErroCar } from './car';
export type { ImovelCar, MotivoErroCar } from './car';

export { areaHectares, caixa, caminhosSvg, centro } from './geometria';
export type { Anel, Caixa, GeometriaPoligono } from './geometria';
