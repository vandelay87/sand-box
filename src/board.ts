import { setClickHandler } from "./handlers";

export const createGrid = (cols: number, rows: number): number[][] =>
  Array.from({ length: cols }, () => new Array(rows).fill(0));

export const updateGrid = (grid: number[][], cols: number, rows: number): number[][] => {
  // Start with a fresh grid for the next frame. This keeps the step pure.
  let nextGrid = createGrid(cols, rows);

  // Walk every column and row in the grid.
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      let state = grid[c][r];

      // Only process sand cells.
      if (state === 1) {
        // If the particle is already on the bottom row, it can't fall further.
        if (r === rows - 1) {
          nextGrid[c][r] = 1;
          continue;
        }

        // Look at the cell below in the original grid.
        let below = grid[c][r + 1];

        // Choose a random horizontal preference when the cell below is blocked.
        // dir === 1 means prefer moving to the right-down diagonal, dir === -1 prefer left-down.
        let dir = Math.random() < 0.5 ? 1 : -1;

        // belowA is the preferred diagonal (c + dir, r + 1) if it's inside bounds; otherwise -1.
        let belowA = (c + dir >= 0 && c + dir < cols) ? grid[c + dir][r + 1] : -1;
        // belowB is the opposite diagonal (c - dir, r + 1) used as a fallback; -1 if out-of-bounds.
        let belowB = (c - dir >= 0 && c - dir < cols) ? grid[c - dir][r + 1] : -1;

        if (below === 0) {
          // The cell below is free: fall straight down.
          nextGrid[c][r + 1] = 1;
        } else if (belowA === 0) {
          // Preferred diagonal is free: move there.
          nextGrid[c + dir][r + 1] = 1;
        } else if (belowB === 0) {
          // Fallback diagonal is free: move there.
          nextGrid[c - dir][r + 1] = 1;
        } else {
          // No available moves: the particle remains in place for this frame.
          nextGrid[c][r] = 1;
        }
      }
    }
  }
  return nextGrid;
};

export const drawBoard = (grid: number[][], ctx: CanvasRenderingContext2D, cell: number, cols: number, rows: number) => {
  // Fill the background.
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, cols * cell, rows * cell);

  // Draw sand particles as white squares.
  ctx.fillStyle = 'white';
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      // Only draw occupied cells.
      if (grid[c][r] === 1) {
        // Draw a single cell at (c, r) scaled by cell size.
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }
};

export const setupBoard = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const CELL = 10;
  const cols = canvas.width / CELL;
  const rows = canvas.height / CELL;

  // Initialise the grid.
  let grid = createGrid(cols, rows);

  // Attach the mouse logic
  setClickHandler(canvas, (c, r) => {
    if (c >= 0 && c < cols && r >= 0 && r < rows) {
      grid[c][r] = 1;
      // Add a 2x2 blob instead of a single point.
      if (c + 1 < cols) grid[c + 1][r] = 1;
      if (r + 1 < rows) grid[c][r + 1] = 1;
    }
  });

  // Start the game loop.
  const loop = () => {
    grid = updateGrid(grid, cols, rows);
    drawBoard(grid, ctx, CELL, cols, rows);
    requestAnimationFrame(loop);
  };

  loop();
};
