export function setClickHandler(canvas: HTMLCanvasElement, cell: number, addSand: (c: number, r: number) => void) {
  let isDragging = false;

  const handleInput = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();

    // Map mouse to canvas space
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Accounts for CSS stretching
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Convert to grid coordinates
    const col = Math.floor((x * scaleX) / cell);
    const row = Math.floor((y * scaleY) / cell);

    addSand(col, row);
  };

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    handleInput(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      handleInput(e);
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
}
