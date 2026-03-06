import './style.css'
import { setupBoard } from './board.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main>
    <h1>Sand box</h1>
    <canvas id="canvas" width="400" height="600">sand playground</canvas>
  </main>
`

setupBoard(document.querySelector<HTMLCanvasElement>('#canvas')!)
