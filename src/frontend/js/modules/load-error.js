// A failed read is not an empty collection. Retry only the read operation.
export function showLoadError(container, message, retry) {
    container.replaceChildren();
    const panel = document.createElement('div');
    panel.className = 'p-6 text-red-700';
    panel.setAttribute('role', 'alert');
    const text = document.createElement('p');
    text.textContent = message;
    panel.appendChild(text);
    if (retry) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mt-3 px-4 py-2 border rounded-md';
        button.textContent = 'Try loading again';
        button.addEventListener('click', async () => {
            button.disabled = true;
            try { await retry(); } catch {
                showLoadError(container, message, retry);
            } finally { button.disabled = false; }
        });
        panel.appendChild(button);
    }
    container.appendChild(panel);
}
