# JP ARENA COMBATE

Arena shooter single-player em Three.js, inspirado na ação de Doom clássico. Escolha **MUNDO GUAMÁ** (mercado verde) ou **MUNDO JURUNAS** (fortaleza de pedra e lava), digite seu nome e sobreviva a quatro ondas de 6, 9, 12 e 17 monstros. A vitória exige eliminar todos os 44 inimigos; vida zerada encerra a partida.

Os monstros MARCUS, ADY, REINALDO, CAVALCANTE, CYNTHIA, JULIANA, SAID, JAINARA, FÁBIO, DEJA e NADJA surgem nos portais, contornam obstáculos e perseguem o jogador com ataques de perto. Eliminações podem deixar vida ou munição. Entre ondas há uma breve pausa, recuperação de vida e reposição de munição.

## Jogar

https://reinaldorego.github.io/jp-arena-combate/

PC: WASD ou setas para mover, mouse para olhar, botão esquerdo para disparar, direito para ADS, R para recarregar e Escape para pausar. A movimentação tem aceleração e desaceleração; o mouse usa sensibilidade linear, com redução durante ADS. FOV de 100°, com transição suave para 50° na mira.

Celular: joystick à esquerda, arraste à direita para olhar, MIRA alterna ADS, ATIRAR dispara enquanto pressionado e permite ajustar a câmera por arraste. RECARREGAR e PAUSA ficam em botões próprios. O HUD mostra apenas vida, munição, jogador, mundo e Kills, além dos indicadores visuais de mira, acerto e dano.

## Desenvolvimento

Node.js 24 e npm:

```sh
npm ci
npm run dev
npm test
npm run build
```

Com Chrome instalado e servidor de desenvolvimento ativo:

```sh
npm run qa:browser
npm run qa:mobile
```

Os testes da simulação cobrem os mapas, navegação, todas as ondas, contagem de eliminações, colisões, tiro, recarga, coleta, vitória, derrota e reinício. Os testes de navegador verificam PC e quatro tamanhos de celular nos dois mundos, incluindo gestos simultâneos, ADS, HUD e fluxo completo de partida. Defina GAME_URL para testar outra URL; capturas ficam em artifacts/.

Pushes em main acionam .github/workflows/pages.yml, que testa, compila e publica no GitHub Pages.