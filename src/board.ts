import { setClickHandler } from "./handlers";

const createGrid = (cols: number, rows: number): Uint8Array =>
  new Uint8Array(cols * rows);

const updateGrid = (grid: Uint8Array, nextGrid: Uint8Array, cols: number, rows: number, bounds: { minC: number; maxC: number; minR: number; maxR: number }) => {
  // Clear the nextGrid so it's ready for new data
  nextGrid.fill(0);

  // New bounds for the next frame
  let nextMinC = cols, nextMaxC = 0;
  let nextMinR = rows, nextMaxR = 0;

  // Only loop through the active area (plus a 1-cell buffer for movement)
  const startR = Math.max(0, bounds.minR - 1);
  const endR = Math.min(rows - 1, bounds.maxR + 1);
  const startC = Math.max(0, bounds.minC - 1);
  const endC = Math.min(cols - 1, bounds.maxC + 1);

  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      const i = r * cols + c; // 1D Index Math: (row * total_width) + column

      if (grid[i] === 1) {
        let newR = r;
        let newC = c;

        if (r === rows - 1) {
          // Stay put if on the floor
          nextGrid[i] = 1;
        } else {
          const below = (r + 1) * cols + c;
          const dir = Math.random() < 0.5 ? 1 : -1;
          const diagA = (r + 1) * cols + (c + dir);
          const diagB = (r + 1) * cols + (c - dir);

          if (grid[below] === 0) {
            newR = r + 1; // Fall straight down
          } else if (c + dir >= 0 && c + dir < cols && grid[diagA] === 0) {
            newR = r + 1;
            newC = c + dir; // Slide diagonally
          } else if (c - dir >= 0 && c - dir < cols && grid[diagB] === 0) {
            newR = r + 1;
            newC = c - dir; // Slide opposite diagonal
          }

          // Place the grain in the new position
          nextGrid[newR * cols + newC] = 1;
        }

        // Expand next frame's search area to include this grain's new position
        nextMinC = Math.min(nextMinC, newC);
        nextMaxC = Math.max(nextMaxC, newC);
        nextMinR = Math.min(nextMinR, newR);
        nextMaxR = Math.max(nextMaxR, newR);
      }
    }
  }

  // If no sand moved (nextMinC > nextMaxC), return empty bounds to "sleep" the engine
  if (nextMaxC < nextMinC) return { minC: 0, maxC: 0, minR: 0, maxR: 0 };

  // Return the new bounds for the next frame
  return { minC: nextMinC, maxC: nextMaxC, minR: nextMinR, maxR: nextMaxR };
};

const drawBoard = (grid: Uint8Array, ctx: CanvasRenderingContext2D, cell: number, cols: number, rows: number) => {
  // Clear the screen
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, cols * cell, rows * cell);

  // Draw the sand
  ctx.fillStyle = "white";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r * cols + c] === 1) {
        // We use fillRect here because it's actually very fast
        // when only drawing the ACTIVE sand grains.
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }
};

export const setupBoard = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Get the actual size the canvas is being displayed at
  const rect = canvas.getBoundingClientRect();

  // Set the internal resolution to match the display size
  canvas.width = rect.width;
  canvas.height = rect.height;

  const CELL = 6;
  const cols = Math.floor(canvas.width / CELL);
  const rows = Math.floor(canvas.height / CELL);

  // Initialise the grid.
  let grid = createGrid(cols, rows);
  let nextGrid = createGrid(cols, rows);
  let currentBounds = { minC: 0, maxC: cols - 1, minR: 0, maxR: rows - 1 };

  // Attach the mouse logic
  setClickHandler(canvas, CELL, (c, r) => {
    const BRUSH_SIZE = 6;
    const half = Math.floor(BRUSH_SIZE / 2);

    // Loop to fill a square area around the mouse click
    for (let offsetR = 0; offsetR < BRUSH_SIZE; offsetR++) {
      for (let offsetC = 0; offsetC < BRUSH_SIZE; offsetC++) {
        // SHIFT the target: Mouse pos + current loop index - half of brush size
        const targetC = c + offsetC - half;
        const targetR = r + offsetR - half;

        // Only place sand if we are within the actual grid boundaries
        if (targetC >= 0 && targetC < cols && targetR >= 0 && targetR < rows) {
          grid[targetR * cols + targetC] = 1;
        }
      }
    }

    // Tell the engine to check the whole screen next frame.
    currentBounds = { minC: 0, maxC: cols - 1, minR: 0, maxR: rows - 1 };
  });

  // Start the game loop.
  const loop = () => {
    // Capture the new bounds returned by the update
    currentBounds = updateGrid(grid, nextGrid, cols, rows, currentBounds);

    drawBoard(nextGrid, ctx, CELL, cols, rows);

    // The nextGrid becomes the current grid for the next frame
    let temp = grid;
    grid = nextGrid;
    nextGrid = temp;

    requestAnimationFrame(loop);
  };

  loop();
};
