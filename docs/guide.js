const tabs = [...document.querySelectorAll('#client-tabs a')];
const panels = tabs.map(tab => document.querySelector(tab.hash));
function selectClient(index, focus = false) {
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
    panels[i].hidden = i !== index;
  });
  if (focus) tabs[index].focus();
}
document.querySelector('#client-tabs').setAttribute('role', 'tablist');
tabs.forEach((tab, index) => {
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-controls', panels[index].id);
  panels[index].setAttribute('role', 'tabpanel');
  tab.addEventListener('click', event => {
    event.preventDefault();
    selectClient(index);
    history.replaceState(null, '', tab.hash);
  });
  tab.addEventListener('keydown', event => {
    const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectClient(next, true);
    history.replaceState(null, '', tabs[next].hash);
  });
});
function selectHash() {
  const index = tabs.findIndex(tab => tab.hash === location.hash);
  if (index >= 0) selectClient(index);
}
selectClient(0);
selectHash();
window.addEventListener('hashchange', selectHash);
document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copy);
    const value = target instanceof HTMLTextAreaElement ? target.value : target.textContent;
    const status = document.getElementById('copy-status');
    const fallback = document.getElementById('manual-copy');
    try {
      await navigator.clipboard.writeText(value);
      status.textContent = '복사했습니다.';
      fallback.hidden = true;
    } catch {
      fallback.hidden = false;
      const input = document.getElementById('copy-fallback');
      input.value = value;
      input.focus();
      input.select();
      status.textContent = '자동 복사가 허용되지 않아 직접 복사할 내용을 열었습니다.';
    }
  });
});
