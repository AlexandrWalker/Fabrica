document.addEventListener('DOMContentLoaded', () => {

  const checkEditMode = document.querySelector('.bx-panel-toggle-on') ?? null;


  const burgerBtn = document.getElementById('burger-btn');

  burgerBtn.addEventListener('click', function () {

    document.documentElement.classList.toggle('menu--open');
  })
});