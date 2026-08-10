document.addEventListener('DOMContentLoaded', async () => {
  for (const element of document.querySelectorAll('[data-include]')) {
    try {
      const response = await fetch(element.dataset.include);
      element.innerHTML = response.ok ? await response.text() : '';
    } catch { element.innerHTML = ''; }
  }

  const navigation = document.querySelector('.site-nav');
  if (!navigation) return;
  const menus = [...navigation.querySelectorAll('details')];
  for (const menu of menus) {
    menu.addEventListener('toggle', () => {
      if (!menu.open) return;
      for (const other of menus) {
        if (other !== menu) other.open = false;
      }
    });
  }
  document.addEventListener('click', (event) => {
    if (navigation.contains(event.target)) return;
    for (const menu of menus) menu.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    for (const menu of menus) menu.open = false;
  });
});
