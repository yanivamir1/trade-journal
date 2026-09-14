const root = () => document.getElementById('modal-root');

export function openModal(innerHtml) {
  const r = root();
  r.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-box">
        <button class="modal-close" type="button" aria-label="Close">✕</button>
        ${innerHtml}
      </div>
    </div>
  `;
  r.classList.add('open');
  r.querySelector('.modal-close').addEventListener('click', closeModal);
  r.querySelector('.modal-backdrop').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) closeModal();
  });
  return r.querySelector('.modal-box');
}

export function closeModal() {
  const r = root();
  r.classList.remove('open');
  r.innerHTML = '';
}
