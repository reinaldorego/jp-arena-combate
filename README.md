# JP ARENA COMBATE / BAIRRO_DO_GUAMÁ

Vertical slice de FPS tático offline, 5 contra 5, em TypeScript, Vite e Three.js. Mapa industrial simétrico construído por código, sem modelos, texturas, músicas ou arquivos de áudio externos. Three.js é dependência de software; todas as representações do jogo são originais e procedurais.

## Executar

Requer Node.js 22.18+ e acesso ao registro npm. No PowerShell use `npm.cmd` se a política de execução bloquear `npm.ps1`.

```sh
npm install
npm run dev
```

Abra http://127.0.0.1:5173 em um navegador desktop com WebGL e mouse. Clique em **Iniciar partida** para ativar áudio e pointer lock. Escolha ataque ou defesa na tela inicial e ajuste a sensibilidade.

WASD move; mouse mira e atira; Ctrl agacha; Shift anda sem passos; R recarrega; E segura para plantar (3s), desarmar (5s) ou recolher a bomba; B abre compra no freeze; 1/2/3 compram rifle/SMG/colete; Tab mostra equipe; Espaço alterna espectador após a morte; Esc pausa; Enter joga revanche após a partida.

## Regras

Freeze de 8s, round de 75s e bomba de 30s. Vida única por round. Primeiro a quatro vitórias ou seis rounds; empate possível. Troca de lado após três rounds. Equipamento gratuito neste slice. As cores representam as equipes permanentes (azul: sua equipe; laranja: adversários), inclusive após a troca de lado.

O núcleo usa uma única máquina de estados: menu → freeze → live → planted/end → freeze/match. Eliminação, tempo, detonação e desarme encerram o round. A bomba cai quando o portador morre; os atacantes podem recuperá-la. Eliminar todos os atacantes depois do plant não concede vitória aos defensores: precisam desarmar.

Os cinco papéis de IA são ponta, âncora, flanco, suporte e portador. Ponta pressiona e faz strafe; âncora segura o site e agacha nos duelos; flanco escolhe a rota oposta antes de convergir; suporte acompanha; portador prioriza plant. Defensores rotacionam ao detectar ataque ou plant. Navegação A* usa o mesmo footprint de colisão que o jogador; tiros fazem interseção de raio com volumes de cabeça, tronco, pernas e paredes. Colete reduz dano, movimento aumenta spread, agachar melhora precisão e tiro reduz velocidade.

## Verificação

```sh
npm test
npm run build
# Com servidor dev ativo e Chrome instalado:
npm run qa:browser
```

O teste de simulação cobre acertos por zona, oclusão, colisão, rotas, três rounds consecutivos com tempo/detonação/desarme, troca de lado, respawn e recuperação da bomba. Também exige três rounds da IA sem intervenção. O teste de navegador grava uma partida completa em WebM, captura telas e gera `artifacts/browser-report.json` com FPS mediano, percentil 5, tempo de abertura e erros de console. A gravação observa os bots em tempo real; os testes controlados de bomba/tempo são separados.

**Estado de entrega:** os arquivos foram implementados, mas a instalação de dependências foi bloqueada pela rede do ambiente (`EACCES` no registro npm). Não há ainda comprovação de build, testes, FPS, gravação ou URL publicada. Os comandos acima produzem essas evidências quando as dependências estiverem disponíveis. Não trate as metas de 60 FPS e abertura em 3s como medições realizadas.

## Estrutura

- `src/sim.ts`: regras, colisão, balística, navegação e bots.
- `src/main.ts`: renderização procedural, entrada, radar e HUD.
- `src/audio.ts`: áudio sintetizado e posicionamento espacial.
- `tests/`: verificações de simulação e gravação/telemetria no navegador.
- `.openai/hosting.json`: identidade do Site e saída estática Vite.

## Celular

Controle virtual à esquerda para movimentar; arraste à direita para olhar. Toque MIRA para ativar/desativar o ADS; segure e arraste ATIRAR para disparar e mirar com o mesmo dedo e AÇÃO / E para plantar, recuperar ou desarmar a bomba. Os botões também permitem recarregar, agachar, andar devagar, comprar, pausar e trocar a câmera. Funciona em retrato e paisagem; paisagem oferece mais espaço para visualizar o combate. A partida usa bots locais, sem multiplayer.

## Publicação

O workflow .github/workflows/pages.yml testa, compila e publica a pasta dist no GitHub Pages a cada envio para main. Ative GitHub Actions em Settings > Pages do repositório. Os assets usam caminhos relativos para funcionar no endereço do projeto.

## Verificação dos controles

Execute npm test para regras e controles; com o servidor ativo, npm run qa:gameplay valida teclado, mouse e ADS e npm run qa:mobile valida layouts e gestos multitoque nas duas orientações.

## Jogabilidade acessível

Fácil é o modo inicial: os inimigos levam mais tempo para reagir, disparam mais devagar e causam metade do dano ao jogador. Normal mantém o combate tático. A recarga é automática quando o pente esvazia durante o disparo. O HUD indica direção e distância até o objetivo, e os personagens mostram ALIADO ou INIMIGO. A precisão depende da velocidade real, em vez da quantidade de deslocamento por quadro. Ao ser eliminado, a câmera escolhe um aliado vivo.
