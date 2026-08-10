// ===== YEAR =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== LIVE COUNTER =====
const faqInput = document.getElementById('faqInput');
const faqCounter = document.getElementById('faqCounter');

faqInput.addEventListener('input', () => {
  const count = countFaqs(faqInput.value);
  faqCounter.textContent = count === 0 ? '0 FAQs detectadas' : `${count} FAQ${count > 1 ? 's' : ''} detectada${count > 1 ? 's' : ''}`;
  faqCounter.classList.toggle('has-faqs', count > 0);
});

// ===== COUNT FAQs =====
function countFaqs(text) {
  if (!text.trim()) return 0;
  const lines = text.split('\n');
  return lines.filter(l => /^P\s*:/i.test(l.trim())).length;
}

// ===== PARSE FAQs =====
function parseFaqs(rawText) {
  const lines = rawText.split('\n');
  const faqs = [];
  let currentFaq = null;
  let currentKey = null; // 'pergunta' or 'resposta'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect new question
    if (/^P\s*:/i.test(trimmed)) {
      if (currentFaq && currentFaq.pergunta && currentFaq.resposta !== undefined) {
        faqs.push(finalizeFaq(currentFaq));
      }
      currentFaq = { pergunta: '', resposta: '' };
      currentKey = 'pergunta';
      const content = trimmed.replace(/^P\s*:\s*/i, '').trim();
      if (content) currentFaq.pergunta = content;
      continue;
    }

    // Detect answer
    if (/^R\s*:/i.test(trimmed)) {
      currentKey = 'resposta';
      const content = trimmed.replace(/^R\s*:\s*/i, '').trim();
      if (content) currentFaq.resposta = content;
      continue;
    }

    // Continuation of previous field
    if (currentFaq && currentKey && trimmed !== '') {
      if (currentFaq[currentKey]) {
        currentFaq[currentKey] += ' ' + trimmed;
      } else {
        currentFaq[currentKey] = trimmed;
      }
    }
  }

  // Push last FAQ
  if (currentFaq && currentFaq.pergunta && currentFaq.resposta !== undefined) {
    faqs.push(finalizeFaq(currentFaq));
  }

  return faqs;
}

// ===== FINALIZE (trim & clean) =====
function finalizeFaq(faq) {
  return {
    pergunta: faq.pergunta.trim(),
    resposta: faq.resposta.trim()
  };
}

// ===== ESCAPE FOR JS STRING =====
function escapeForJs(str) {
  // Only escape single quotes (not already escaped)
  return str.replace(/\\'/g, "'").replace(/'/g, "\\'");
}

// ===== WRAP CONTENT =====
function wrapPergunta(text) {
  // If text already has h2 tag, preserve it; otherwise wrap
  if (/^<h2>/i.test(text.trim())) return text.trim();
  return `<h2>${text.trim()}</h2>`;
}

function wrapResposta(text) {
  // If text already has block-level tags (p, ul, ol, div), preserve; otherwise wrap in <p>
  const hasBlockTag = /^<(p|ul|ol|div|blockquote)/i.test(text.trim());
  if (hasBlockTag) return text.trim();
  return `<p>${text.trim()}</p>`;
}

// ===== GENERATE CODE =====
function generateCode() {
  const catId = document.getElementById('categoryId').value.trim();
  const rawText = faqInput.value.trim();
  const errorBox = document.getElementById('errorBox');
  const errorMsg = document.getElementById('errorMsg');
  const outputSection = document.getElementById('outputSection');
  const btn = document.getElementById('generateBtn');

  // Reset state
  errorBox.style.display = 'none';
  outputSection.style.display = 'none';

  // Validate
  if (!catId) {
    showError('Por favor, insira o número da categoria.');
    return;
  }

  if (!rawText) {
    showError('Por favor, cole o conteúdo das FAQs no campo acima.');
    return;
  }

  // Loading animation
  btn.classList.add('loading');
  btn.disabled = true;

  setTimeout(() => {
    const faqs = parseFaqs(rawText);

    if (faqs.length === 0) {
      btn.classList.remove('loading');
      btn.disabled = false;
      showError('Nenhuma FAQ detectada. Certifique-se de usar "P:" para perguntas e "R:" para respostas.');
      return;
    }

    // Build output
    const lines = [];
    lines.push(`${catId}: [`);

    faqs.forEach((faq, idx) => {
      const pergunta = wrapPergunta(faq.pergunta);
      const resposta = wrapResposta(faq.resposta);
      const isLast = idx === faqs.length - 1;

      lines.push(`    {`);
      lines.push(`        pergunta: '${escapeForJs(pergunta)}',`);
      lines.push(`        resposta: '${escapeForJs(resposta)}' `);
      if (isLast) {
        lines.push(`    }`);
      } else {
        lines.push(`    },`);
      }
    });

    lines.push(`  ],`);

    const output = lines.join('\n');

    document.getElementById('outputCode').textContent = output;
    document.getElementById('faqBadge').textContent = `${faqs.length} FAQ${faqs.length > 1 ? 's' : ''} gerada${faqs.length > 1 ? 's' : ''}`;
    outputSection.style.display = 'block';

    // Scroll to output
    setTimeout(() => {
      outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    btn.classList.remove('loading');
    btn.disabled = false;
  }, 300);
}

// ===== COPY CODE =====
async function copyCode() {
  const code = document.getElementById('outputCode').textContent;
  const copyBtn = document.getElementById('copyBtn');

  try {
    await navigator.clipboard.writeText(code);
    const original = copyBtn.innerHTML;
    copyBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      Copiado!`;
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.innerHTML = original;
      copyBtn.classList.remove('copied');
    }, 2500);
  } catch (e) {
    // Fallback
    const el = document.createElement('textarea');
    el.value = code;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    copyBtn.textContent = '✓ Copiado!';
    setTimeout(() => {
      copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar código`;
      copyBtn.classList.remove('copied');
    }, 2500);
  }
}

// ===== CLEAR ALL =====
function clearAll() {
  document.getElementById('categoryId').value = '';
  faqInput.value = '';
  faqCounter.textContent = '0 FAQs detectadas';
  faqCounter.classList.remove('has-faqs');
  document.getElementById('errorBox').style.display = 'none';
  document.getElementById('outputSection').style.display = 'none';
  document.getElementById('categoryId').focus();
}

// ===== SHOW ERROR =====
function showError(msg) {
  const errorBox = document.getElementById('errorBox');
  document.getElementById('errorMsg').textContent = msg;
  errorBox.style.display = 'flex';
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== KEYBOARD SHORTCUT (Ctrl+Enter to generate) =====
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    generateCode();
  }
});
