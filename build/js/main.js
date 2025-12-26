document.addEventListener('DOMContentLoaded', () => {

  const checkEditMode = document.querySelector('.bx-panel-toggle-on') ?? null;


  const burgerBtn = document.getElementById('burger-btn');

  burgerBtn.addEventListener('click', function () {

    document.documentElement.classList.toggle('menu--open');
  });

  (function modal() {
    const modal = document.getElementById('menu');
    const overlay = document.getElementById('overlay');

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const CLOSE_THRESHOLD = 120; // px

    modal.addEventListener('pointerdown', e => {
      startY = e.clientY;
      isDragging = true;
      modal.classList.add('dragging');
      modal.setPointerCapture(e.pointerId);
    });

    modal.addEventListener('pointermove', e => {
      if (!isDragging) return;

      currentY = e.clientY - startY;

      if (currentY > 0) {
        modal.style.transform = `translateY(${currentY}px)`;
      }
    });

    modal.addEventListener('pointerup', endDrag);
    modal.addEventListener('pointercancel', endDrag);

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      modal.classList.remove('dragging');

      if (currentY > CLOSE_THRESHOLD) {
        closeModal();
        // } else {
        // modal.style.transform = 'translateY(0)';
      }

      currentY = 0;
    }

    function closeModal() {
      document.documentElement.classList.remove('menu--open');
      modal.style.transform = 'translateY(0)';
    }
  })();

});