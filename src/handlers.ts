export function setClickHandler(canvas: HTMLCanvasElement, cell: number, addSand: (c: number, r: number) => void) {
  let isDragging = false;

  const getGridCoords = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      col: Math.floor((x * scaleX) / cell),
      row: Math.floor((y * scaleY) / cell),
    };
  };

  const handleInput = (e: MouseEvent) => {
    const { col, row } = getGridCoords(e.clientX, e.clientY);
    addSand(col, row);
  };

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    handleInput(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) handleInput(e);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDragging = true;
    const touch = e.touches[0];
    const { col, row } = getGridCoords(touch.clientX, touch.clientY);
    addSand(col, row);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDragging) return;
    const touch = e.touches[0];
    const { col, row } = getGridCoords(touch.clientX, touch.clientY);
    addSand(col, row);
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    isDragging = false;
  });
}
