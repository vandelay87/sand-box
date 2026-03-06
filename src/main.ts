import './style.css'
import { setupBoard } from './board.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main>
    <h1>Sand box</h1>
    <canvas id="canvas" width="300" height="400">sand playground</canvas>
  </main>
`

setupBoard(document.querySelector<HTMLCanvasElement>('#canvas')!)
