import { setClickHandler } from "./handlers";

export const createGrid = (cols: number, rows: number): Uint8Array =>
  new Uint8Array(cols * rows);

export const updateGrid = (grid: Uint8Array, nextGrid: Uint8Array, cols: number, rows: number) => {
  // Clear the nextGrid so it's ready for new data
  nextGrid.fill(0);

  // Walk every column and row in the grid.
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const i = r * cols + c;
      let state = grid[i];

      // Only process sand cells.
      if (state === 1) {
        // If the particle is already on the bottom row, it can't fall further.
        if (r === rows - 1) {
          nextGrid[i] = 1;
          continue;
        }

        // Look at the cell below in the original grid.
        const below = (r + 1) * cols + c;

        // Choose a random horizontal preference when the cell below is blocked.
        // dir === 1 means prefer moving to the right-down diagonal, dir === -1 prefer left-down.
        const dir = Math.random() < 0.5 ? 1 : -1;

        // diagA is the preferred diagonal (c + dir, r + 1) if it's inside bounds; otherwise -1.
        const diagA = (r + 1) * cols + (c + dir);
        // diagB is the opposite diagonal (c - dir, r + 1) used as a fallback; -1 if out-of-bounds.
        const diagB = (r + 1) * cols + (c - dir);

        if (grid[below] === 0) {
          // The cell below is free: fall straight down.
          nextGrid[below] = 1;
        } else if (c + dir >= 0 && c + dir < cols && grid[diagA] === 0) {
          // Preferred diagonal is free: move there.
          nextGrid[diagA] = 1;
        } else if (c - dir >= 0 && c - dir < cols && grid[diagB] === 0) {
          // Fallback diagonal is free: move there.
          nextGrid[diagB] = 1;
        } else {
          // No available moves: the particle remains in place for this frame.
          nextGrid[i] = 1;
        }
      }
    }
  }
};

export const drawBoard = (grid: Uint8Array, ctx: CanvasRenderingContext2D, cell: number, cols: number, rows: number) => {
  // Fill the background.
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, cols * cell, rows * cell);

  // Draw sand particles as white squares.
  ctx.fillStyle = 'white';
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === 1) {
      const c = i % cols; // Get column from index
      const r = Math.floor(i / cols); // Get row from index
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }
};

export const setupBoard = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const CELL = 10;
  const cols = Math.floor(canvas.width / CELL);
  const rows = Math.floor(canvas.height / CELL);

  // Initialise the grid.
  let grid = createGrid(cols, rows);
  let nextGrid = createGrid(cols, rows);

  // Attach the mouse logic
  setClickHandler(canvas, (c, r) => {
    // Helper to set a grain using 1D index math
    const setSand = (col: number, row: number) => {
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        grid[row * cols + col] = 1;
      }
    };

    setSand(c, r);
    setSand(c + 1, r);
    setSand(c, r + 1);
    setSand(c + 1, r + 1);
  });

  // Start the game loop.
  const loop = () => {
    updateGrid(grid, nextGrid, cols, rows);
    drawBoard(nextGrid, ctx, CELL, cols, rows);

    // The nextGrid becomes the current grid for the next frame
    let temp = grid;
    grid = nextGrid;
    nextGrid = temp;

    requestAnimationFrame(loop);
  };

  loop();
};
