# Control: subpackage entry scripts

A minimal native mini-game (plain JS, no Engine, no adapter, no build step) that loads four
subpackages and records whether each subpackage's `game.js` ran. It separates DevTools / runtime
behavior from anything the adapter or the Editor export does.

| name | root | |
|---|---|---|
| stageA | `stageA/` | official docs style |
| stageB | `stageB` | no trailing slash |
| stageC | `public/stageC` | nested, no trailing slash (Editor export style) |
| stageD | `public/stageD/` | nested, trailing slash |

Results are drawn on screen (real device) and, if `collector` in `config.js` is reachable, posted to it.
Run `node conformance/control/serve.mjs` to collect results in DevTools: it writes `config.js`, which is
not in the repository (it holds the address of the machine that runs the server).
