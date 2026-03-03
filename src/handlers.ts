export function setClickHandler(canvas: HTMLCanvasElement, addSand: (c: number, r: number) => void) {
  const CELL = 10;
  let isDragging = false;

  const handleInput = (e: MouseEvent) => {
    const col = Math.floor(e.offsetX / CELL);
    const row = Math.floor(e.offsetY / CELL);

    addSand(col, row);
  };

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    handleInput(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      // Use getBoundingClientRect to ensure coordinates are relative to canvas
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.floor(x / CELL);
      const row = Math.floor(y / CELL);

      addSand(col, row);
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
}
