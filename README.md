# Orák Cut

Orák Cut é um MVP web 100% front-end para gerar lista de peças e um plano visual de corte em chapa de MDF para móveis simples.

O projeto não usa backend, banco de dados externo, IA ou dependências obrigatórias. Ele funciona abrindo o arquivo `index.html` diretamente no navegador e também pode ser publicado gratuitamente no GitHub Pages.

## Novidades da versão 2

- Dados de projeto: nome do projeto, cliente, ambiente e observações gerais.
- Salvamento local no navegador com `localStorage`.
- Exportação e importação de projeto em JSON.
- Lista de peças editável após a geração automática.
- Inclusão, edição e exclusão de peças manuais.
- Atualização do plano de corte após edição das peças.
- Fita de borda por lado: superior, inferior, esquerda e direita.
- Cálculo simples do total de fita em metros lineares.
- Alertas técnicos visuais.
- Resumo individual por chapa.
- Impressão/PDF mais organizada.
- Melhor prévia de foto de referência.

## Novidades da versão 4

- Seção **Leitura por Imagem** com upload local e canvas.
- Marcação de dois pontos de referência para definir escala em pixels por milímetro.
- Medições manuais sobre a foto após definir a escala.
- Lista de medições editável e removível.
- Análise visual simples com Canvas API: escala de cinza, contraste por diferença de pixels, bordas básicas e retângulo principal estimado.
- Sugestão assistiva de tipo de móvel com confiança baixa, média ou alta.
- Botão para aplicar medidas estimadas ao formulário principal.
- Confirmação obrigatória antes de gerar cortes com medidas vindas da imagem.
- Código preparado para evoluir para OpenCV.js futuramente, sem tornar a biblioteca obrigatória.

## Novidades da Etapa 5A

- Seção **Medição AR** experimental com WebXR.
- Verificação de suporte `immersive-ar` no navegador.
- Início de sessão AR com `hit-test` quando o dispositivo suporta.
- Retículo simples renderizado em WebGL puro, sem Three.js.
- Marcação de pontos 3D no mundo real.
- Pontos com tipo, nome, coordenadas e data/hora.
- Cálculo de distância 3D em metros e milímetros.
- Geração de medições principais: largura, altura e profundidade.
- Medição personalizada escolhendo dois pontos.
- Aplicação das medidas AR ao formulário principal com confirmação manual.
- Fallback para **Leitura por Imagem** quando WebXR não está disponível.
- Exportação das medidas AR junto do JSON do projeto.
- Exportação DXF simples do plano de corte, com chapas, peças, códigos e medidas em milímetros.
- Vetorização experimental de desenho/imagem para gerar linhas de corte em SVG e DXF.

## Como usar

1. Abra `index.html` no navegador.
2. Preencha os dados do projeto, cliente e ambiente.
3. Escolha o tipo de móvel e informe as medidas em milímetros.
4. Se quiser, envie uma foto apenas como referência visual.
5. Clique em **Gerar cortes**.
6. Edite a lista de peças se necessário.
7. Clique em **Atualizar plano de corte** depois de editar peças.
8. Exporte CSV, JSON, SVG, DXF ou use **Imprimir / PDF**.

## Como usar Linha de Corte por Desenho

1. Abra a seção **Linha de Corte por Desenho**.
2. Envie uma imagem com fundo claro e desenho escuro.
3. Ajuste o **Limiar escuro** até a linha vermelha acompanhar o desenho.
4. Informe a largura final em milímetros se quiser escala real no SVG/DXF.
5. Clique em **Gerar linhas**.
6. Baixe **SVG corte** ou **DXF corte**.

Nesta versão, o sistema gera o contorno das áreas escuras. Se o desenho tiver linha grossa, o arquivo terá o contorno dessa linha grossa, não a linha central perfeita.

## Como usar a leitura por imagem

1. Abra a seção **Leitura por Imagem**.
2. Envie uma foto frontal do móvel sempre que possível.
3. No modo **Referência**, clique em dois pontos de uma medida conhecida.
4. Informe a medida real entre esses dois pontos em milímetros.
5. O sistema calcula a escala estimada em pixels por milímetro.
6. No modo **Medição**, clique em dois pontos para medir partes do móvel.
7. Renomeie as medições, por exemplo: `largura total`, `altura total` ou `profundidade aparente`.
8. Use **Analisar bordas** para tentar encontrar o retângulo principal do móvel.
9. Confira a sugestão de tipo de móvel.
10. Clique em **Usar medidas detectadas** para preencher o formulário principal.
11. Revise manualmente as medidas e marque **Conferi e confirmo as medidas** antes de gerar cortes.

## Como usar a Medição AR Experimental

1. Abra a seção **Medição AR** em um celular compatível.
2. Use **Verificar suporte AR**.
3. Se aparecer AR disponível, toque em **Iniciar AR**.
4. Mova o celular devagar para mapear o ambiente.
5. Aponte para uma superfície plana até a mira aparecer.
6. Use os botões para marcar canto esquerdo, canto direito, ponto superior, ponto inferior e profundidade.
7. O Orák Cut calcula largura, altura e profundidade quando os pares necessários existem.
8. Confira as medidas, marque **Conferi as medidas e quero aplicar ao projeto** e toque em **Aplicar medidas ao projeto**.
9. Antes de produzir, confira tudo com trena.

## Requisitos da AR

- Navegador com WebXR e suporte a `immersive-ar`.
- Dispositivo móvel compatível com AR.
- Página servida em contexto seguro, como GitHub Pages com HTTPS.
- Câmera e sensores liberados pelo navegador.

Em navegadores sem WebXR, como muitos desktops, o app continua funcionando e direciona para **Leitura por Imagem**.

## Limitações da Medição AR

- A medição AR é estimativa.
- Pode haver erro por iluminação, reflexo, superfície lisa ou câmera instável.
- A disponibilidade varia muito entre navegador, sistema operacional e aparelho.
- O recurso pode não funcionar abrindo o arquivo localmente por `file://`; em geral, AR exige HTTPS.
- Não envie para máquina sem conferência manual.
- Use AR para capturar medidas iniciais, não como única fonte final.

## Limitações da medição por foto

- A leitura por imagem é apenas estimativa.
- Foto em perspectiva pode gerar medidas erradas.
- Foto frontal melhora o resultado, mas ainda não garante precisão.
- Profundidade dificilmente é confiável em foto frontal.
- Reflexos, sombras, fundo poluído e baixa resolução prejudicam a detecção de bordas.
- A escala por dois pontos só é válida no mesmo plano da imagem.
- Sempre confira com trena antes de enviar para produção.

## Como funciona a escala por dois pontos

O usuário marca dois pontos na imagem e informa a medida real entre eles em milímetros. O Orák Cut calcula:

```text
pixels por mm = distância em pixels / medida real em mm
```

Depois disso, outras medições feitas na foto são convertidas para milímetros usando essa escala. Esse cálculo não corrige perspectiva nem distorção da lente.

## Móveis disponíveis

- Nicho simples
- Armário 2 portas
- Painel simples
- Mesa simples

## Salvamento no navegador

Use os botões:

- **Salvar projeto**: salva o formulário e a lista atual no `localStorage`.
- **Carregar projeto**: recupera o último projeto salvo neste navegador.
- **Limpar salvo**: remove o projeto salvo do navegador.

Fotos grandes não são salvas no `localStorage`, pois podem ultrapassar a cota do navegador. Nesse caso, a imagem fica apenas como prévia temporária.

## Exportar e importar JSON

Use:

- **Exportar JSON** para baixar um arquivo com dados do formulário, dados do projeto, configurações da chapa, lista de peças, chapas calculadas e total de fita.
- **Importar JSON** para restaurar um projeto exportado e gerar ou atualizar novamente o plano de corte.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie os arquivos deste projeto para a branch principal.
3. No GitHub, acesse **Settings > Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch principal e a pasta raiz `/`.
6. Salve e aguarde o GitHub gerar a URL pública.

O arquivo `.nojekyll` está incluído para evitar processamento pelo Jekyll e servir os arquivos estáticos diretamente.

## Limitações da versão atual

- A foto enviada é apenas referência visual, sem leitura automática.
- O algoritmo de corte é simples e não substitui um otimizador profissional.
- A rotação automática só ocorre quando o veio está como indiferente.
- O DXF é um desenho 2D simples para conferência e evolução do projeto; confira no software de corte antes de produzir.
- A linha de corte por desenho depende da qualidade da imagem e pode gerar linhas serrilhadas em fotos de baixa resolução.
- Não calcula canal para fundo, rebaixo, ferragens, furação ou usinagem.
- A fita de borda considera apenas o comprimento linear das bordas marcadas.
- As medidas devem ser conferidas antes de enviar para produção.

## Próximos passos

- Biblioteca de ferragens.
- Furação.
- Canal para fundo.
- Integração com IA.
- Leitura de imagem.
- Cadastro de materiais.
- Cálculo de custo.
- OpenCV.js.
- IA real de segmentação.
- Detecção de portas e prateleiras.
- Correção de perspectiva.
- Leitura por marcador ArUco.
- Modelos de visão rodando no navegador.
- Melhorar precisão da AR.
- Correção de plano.
- Detecção automática de paredes e superfícies.
- Visualização 3D do móvel no ambiente.
- Integração com Unity AR Foundation.
- Comparação entre medida AR e medida manual.
- Modo conferência com trena.
