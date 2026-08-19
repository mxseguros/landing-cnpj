# farm-tools — consulta de imóvel rural pelo CAR

Origem: [`farmanalytica/farm_tools`](https://github.com/farmanalytica/farm_tools),
plugin QGIS da FARM Analytica. **Não** é um sistema de orçamento: é uma
ferramenta de sensoriamento remoto agrícola (Earth Engine, séries de índice de
vegetação, imagens Sentinel/Landsat, clima, MapBiomas) rodando dentro do QGIS,
em Python.

A peça que serve a uma solicitação de orçamento é uma só: o
`services/car_service.py`, que resolve um código do CAR (Cadastro Ambiental
Rural) no contorno da propriedade. É essa peça que está portada aqui.

## Por que ela importa para a cotação

Área é a variável que mais pesa no seguro rural, e é justamente a que o produtor
mais erra ao preencher formulário — ele informa a área da matrícula, a área
plantada ou um arredondamento de memória. Com o código do CAR, a área sai do
contorno oficial, junto do município, que é o que o motor de score usa para
decidir se o lead está dentro do raio de atendimento (`lib/agent/score.ts`).

Na prática o produtor digita um campo e a página devolve contorno, município e
hectares — em vez de fazer três perguntas que ele responderia por estimativa.

## O que foi portado, e o que mudou

| `car_service.py` | aqui |
|---|---|
| Regex do código, base do S3, busca em dois passos | igual (`car.ts`) |
| `json.loads` do índice inteiro | índice invertido por município + varredura em streaming como retaguarda |
| Casamento por prefixo quando a chave é mais longa | igual (na retaguarda) |
| Escreve `.geojson` em disco para o QGIS abrir | devolve a geometria em memória |
| — | área em hectares calculada do contorno (`geometria.ts`) |
| — | contorno já como caminho SVG, para a página desenhar sem biblioteca de mapa |

### O passo 1 não sobrevive à web

`stem_index_SP.json` tem 37 MB e mapeia imóvel → chunk. No QGIS o arquivo é
baixado e passado por `json.loads`, e o usuário aceita esperar. Aqui não dá: as
entradas não são ordenadas, então não há busca binária por Range, e um município
que caia perto do fim exige ler quase tudo — medi 10,5 s até achar um código que
aparecia depois de 33 MB. O índice de Minas tem 92 MB.

`gerar-indice.mjs` inverte a chave uma vez e grava `municipios-chunks.json`:

```
node lib/farm-tools/gerar-indice.mjs SP MG
```

O código do CAR já carrega o código IBGE do município (`SP-3522604-…` é
Itapira), e um município é coberto por poucas células da grade — Itapira, por
nove; Águas de Lindóia, por uma. SP e MG inteiros, 1.496 municípios, cabem em
208 KB, e a consulta baixa chunks de ~200 KB até achar, em vez de varrer o
índice. Medido: 1,4 s na primeira consulta, 8 ms com os chunks em cache.

O arquivo é otimização, não correção: código de UF fora dele cai na varredura em
streaming, que continua no `car.ts` e para no primeiro acerto — testado com um
código de Goiás. Regerar é opcional e não é dependência de build, porque o
resultado está versionado.

Um detalhe de comportamento: quando o município **está** no arquivo e o imóvel
não aparece nas células dele, o `car.ts` responde "não encontrado" sem cair na
varredura. As células cobrem a área inteira do município, então imóvel novo cai
numa célula que já existe, e o caso real é dígito errado no hexadecimal — não
vale fazer quem errou a digitação esperar 15 s pela mesma resposta.

O cálculo de área não veio do plugin — no QGIS quem mede é o próprio QGIS.
Aqui é fórmula esférica (Chamberlain & Duquette), com erro da ordem de 0,3%
contra o elipsoide. Por isso a interface apresenta o número como aproximado e
o corretor confirma na cotação.

## Fonte dos dados

Bucket público do projeto *conformidade rural*, sem autenticação:

```
https://dados-car-963200076509-us-east-2-an.s3.us-east-2.amazonaws.com/local_chunks/area_overlay
├── stem_index_{UF}.json          código do CAR → arquivo de chunk
└── chunks/chunk_{X}_{Y}.geojson  FeatureCollection com a geometria
```

Não é a API oficial do SICAR e não tem contrato de disponibilidade com a MX. A
seção da landing trata falha como caminho normal, não como exceção: se a
consulta não responde, o formulário segue sem ela e o lead chega mesmo assim.

## Licença — pendente de decisão da MX

O FARM tools é **GPL v2 or later**. O que está aqui foi reescrito em TypeScript
a partir do protocolo de acesso (URLs, formato do código, ordem das duas
requisições), não traduzido linha a linha, e protocolo de acesso a dado público
dificilmente é expressão protegida. Ainda assim, quem decide o risco que quer
correr é a MX, não este repositório — vale confirmar com quem cuida do jurídico
antes de o site ir a público, ou obter da FARM Analytica uma autorização escrita
de uso desta parte.
