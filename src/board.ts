import { setClickHandler } from "./handlers";

export const createGrid = (cols: number, rows: number): Uint8Array =>
  new Uint8Array(cols * rows);

export const updateGrid = (grid: Uint8Array, nextGrid: Uint8Array, cols: number, rows: number, bounds: { minC: number; maxC: number; minR: number; maxR: number }) => {
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

// Outside of the loop so we don't re-allocate it every frame
let imageData: ImageData | null = null;

export const drawBoard = (grid: Uint8Array, ctx: CanvasRenderingContext2D, cell: number, cols: number, rows: number) => {
  const width = cols * cell;
  const height = rows * cell;

  // Initialize the buffer once
  if (!imageData) {
    imageData = ctx.createImageData(width, height);
  }

  const data = imageData.data;

  // Iterate through every screen pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Find which grid cell this screen pixel belongs to
      const gridC = Math.floor(x / cell);
      const gridR = Math.floor(y / cell);
      const gridIndex = gridR * cols + gridC;

      const pixelIndex = (y * width + x) * 4;
      const isSand = grid[gridIndex] === 1;

      // Set RGBA values
      // If sand: White (255, 255, 255). If empty: Black (0, 0, 0)
      const color = isSand ? 255 : 0;
      data[pixelIndex] = color;     // Red
      data[pixelIndex + 1] = color; // Green
      data[pixelIndex + 2] = color; // Blue
      data[pixelIndex + 3] = 255;   // Alpha (Always fully opaque)
    }
  }

  // Send the entire pixel buffer to the canvas in one call
  ctx.putImageData(imageData, 0, 0);
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
  let currentBounds = { minC: 0, maxC: cols - 1, minR: 0, maxR: rows - 1 };

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

    // "Wake up" the simulation area when the user clicks
    // We expand the current bounds to include the click area
    currentBounds.minC = Math.min(currentBounds.minC, c);
    currentBounds.maxC = Math.max(currentBounds.maxC, c + 1);
    currentBounds.minR = Math.min(currentBounds.minR, r);
    currentBounds.maxR = Math.max(currentBounds.maxR, r + 1);
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
