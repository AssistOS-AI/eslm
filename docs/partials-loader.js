document.addEventListener('DOMContentLoaded', async () => {
  for (const element of document.querySelectorAll('[data-include]')) {
    try {
      const response = await fetch(element.dataset.include);
      element.innerHTML = response.ok ? await response.text() : '';
    } catch { element.innerHTML = ''; }
  }
});
