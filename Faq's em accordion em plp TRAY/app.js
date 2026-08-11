// ==============================================================================
// GERADOR DE CÓDIGO FAQ ACCORDION PARA CMS TRAY (PLP)
// ==============================================================================
// Este script é responsável por:
// 1. Atualizar o ano atual no rodapé da página.
// 2. Monitorar a digitação na caixa de texto com debounce (contador de FAQs em tempo real).
// 3. Identificar automaticamente o formato do texto inserido (Markdown, Prefixado P:/R: ou Texto Simples).
// 4. Converter Markdown (negrito e links) para tags HTML compatíveis.
// 5. Analisar o conteúdo e extrair os pares de Pergunta e Resposta usando heurísticas inteligentes.
// 6. Formatar o código JavaScript de saída pronto para ser colado na Tray.
// 7. Oferecer utilitários de interface (copiar código com fallback, limpar campos, atalhos de teclado).
// ==============================================================================

// ===== 1. ATUALIZAÇÃO DO ANO NO RODAPÉ =====
// Define dinamicamente o ano corrente no elemento HTML de ID 'year'
document.getElementById('year').textContent = new Date().getFullYear();

// ===== 2. ELEMENTOS DO DOM E CONTADOR EM TEMPO REAL (DEBOUNCED) =====
// Referências aos elementos principais de entrada de texto e contador visual
const entradaFaq = document.getElementById('faqInput');
const contadorFaq = document.getElementById('faqCounter');
let temporizadorDebounce;

// Evento disparado a cada caractere digitado na caixa de texto
entradaFaq.addEventListener('input', () => {
  // Limpa o temporizador anterior para evitar reprocessamento desnecessário enquanto o usuário digita
  clearTimeout(temporizadorDebounce);
  
  // Aguarda 350 milissegundos de inatividade antes de analisar o texto
  temporizadorDebounce = setTimeout(() => {
    const texto = entradaFaq.value;
    
    // Se o texto estiver vazio ou apenas com espaços, reseta o contador
    if (!texto.trim()) {
      contadorFaq.textContent = '0 FAQs detectadas';
      contadorFaq.classList.remove('has-faqs');
      return;
    }
    
    // Processa o texto usando o roteador principal de análise
    const { faqs } = analisarFaqs(texto);
    const quantidade = faqs.length;
    
    // Atualiza o texto do contador indicando a quantidade e ajustando o plural
    contadorFaq.textContent = quantidade === 0
      ? '0 FAQs detectadas'
      : `${quantidade} FAQ${quantidade > 1 ? 's' : ''} detectada${quantidade > 1 ? 's' : ''}`;
    
    // Alterna a classe visual de destaque quando houver 1 ou mais FAQs
    contadorFaq.classList.toggle('has-faqs', quantidade > 0);
  }, 350);
});

// ===== 3. DETECTOR AUTOMÁTICO DE FORMATO =====
/**
 * Identifica o formato do texto colado.
 * Prioridade:
 * 1. 'markdown': Linha de texto seguida por 3 ou mais traços ('---') na linha seguinte.
 * 2. 'prefixed': Linhas iniciando com P: ou R: (formato legado).
 * 3. 'plain': Texto simples separado por linhas em branco.
 * 
 * @param {string} texto - Conteúdo bruto da caixa de texto.
 * @returns {string} 'markdown' | 'prefixed' | 'plain'
 */
function detectarFormato(texto) {
  if (/^.+\n-{3,}/m.test(texto)) return 'markdown';
  if (/^[PR]\s*:/im.test(texto)) return 'prefixed';
  return 'plain';
}

// ===== 4. CONVERTER MARKDOWN PARA HTML =====
/**
 * Converte elementos inline de Markdown (links e negrito) para HTML puro.
 * Suporta:
 * - Links com negrito interno: [**Texto**](https://url.com) -> <a href="..." target="_blank"><strong>Texto</strong></a>
 * - Links normais: [Texto](https://url.com) -> <a href="..." target="_blank">Texto</a>
 * - Negrito simples: **Texto** -> <strong>Texto</strong>
 * 
 * @param {string} texto - Texto em formato Markdown.
 * @returns {string} Texto com marcações HTML.
 */
function converterMarkdownParaHtml(texto) {
  let html = texto.trim();
  
  // 1. Links que contêm negrito dentro do texto do link
  html = html.replace(
    /\[([^\]]*\*\*[^\]]*)\]\((https?:\/\/[^)]+)\)/g,
    (_, textoLink, url) => {
      const conteudoInterno = textoLink.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return `<a href="${url}" target="_blank">${conteudoInterno}</a>`;
    }
  );
  
  // 2. Links padrão sem negrito
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // 3. Negrito padrão em Markdown
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  return html;
}

// ===== 5. PARSER 1: FORMATO PREFIXADO (P: / R:) =====
/**
 * Extrai FAQs do formato legado onde cada pergunta começa com "P:" e cada resposta com "R:".
 * Suporta respostas de múltiplas linhas.
 * 
 * @param {string} textoBruto - Texto de entrada.
 * @returns {Array<{pergunta: string, resposta: string}>} Lista de objetos de FAQ.
 */
function analisarFaqsPrefixadas(textoBruto) {
  const linhas = textoBruto.split('\n');
  const faqs = [];
  let faqAtual = null;
  let chaveAtual = null; // 'pergunta' ou 'resposta'

  for (let i = 0; i < linhas.length; i++) {
    const linhaLimpa = linhas[i].trim();

    // Início de uma nova pergunta (Prefixo P:)
    if (/^P\s*:/i.test(linhaLimpa)) {
      if (faqAtual && faqAtual.pergunta && faqAtual.resposta.trim()) {
        faqs.push(finalizarFaq(faqAtual));
      }
      faqAtual = { pergunta: '', resposta: '' };
      chaveAtual = 'pergunta';
      const conteudo = linhaLimpa.replace(/^P\s*:\s*/i, '').trim();
      if (conteudo) faqAtual.pergunta = conteudo;
      continue;
    }

    // Início da resposta correspondente (Prefixo R:)
    if (/^R\s*:/i.test(linhaLimpa)) {
      chaveAtual = 'resposta';
      const conteudo = linhaLimpa.replace(/^R\s*:\s*/i, '').trim();
      if (conteudo) faqAtual.resposta = conteudo;
      continue;
    }

    // Continuação de linhas para a pergunta ou resposta atual
    if (faqAtual && chaveAtual && linhaLimpa !== '') {
      faqAtual[chaveAtual] = faqAtual[chaveAtual]
        ? faqAtual[chaveAtual] + ' ' + linhaLimpa
        : linhaLimpa;
    }
  }

  // Adiciona a última FAQ do arquivo se válida
  if (faqAtual && faqAtual.pergunta && faqAtual.resposta.trim()) {
    faqs.push(finalizarFaq(faqAtual));
  }

  return faqs;
}

// ===== 6. PARSER 2: FORMATO MARKDOWN (Título + Linha '---') =====
/**
 * Extrai FAQs no formato Markdown, reconhecendo títulos seguidos de underlines ("---").
 * Converte automaticamente links e negritos na resposta para HTML.
 * 
 * @param {string} texto - Texto em Markdown.
 * @returns {Array<{pergunta: string, resposta: string}>} Lista de objetos de FAQ.
 */
function analisarFaqsMarkdown(texto) {
  const faqs = [];
  const linhas = texto.split('\n');
  let perguntaAtual = null;
  let partesResposta = [];

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const proximaLinha = (linhas[i + 1] || '').trim();

    // Se a próxima linha contiver 3 ou mais traços ('---'), a linha atual é uma Pergunta
    if (/^-{3,}$/.test(proximaLinha)) {
      if (perguntaAtual !== null && partesResposta.length > 0) {
        faqs.push(finalizarFaq({
          pergunta: perguntaAtual,
          resposta: converterMarkdownParaHtml(partesResposta.join(' '))
        }));
      }
      perguntaAtual = linha.trim();
      partesResposta = [];
      i++; // Pula a linha do separador ('---')
      continue;
    }

    // Coleta as linhas da resposta
    if (perguntaAtual !== null) {
      const linhaLimpa = linha.trim();
      if (linhaLimpa) partesResposta.push(linhaLimpa);
    }
  }

  // Adiciona a última FAQ encontrada
  if (perguntaAtual !== null && partesResposta.length > 0) {
    faqs.push(finalizarFaq({
      pergunta: perguntaAtual,
      resposta: converterMarkdownParaHtml(partesResposta.join(' '))
    }));
  }

  return faqs;
}

// ===== 7. PARSER 3: FORMATO TEXTO SIMPLES (Heurística Inteligente) =====
/**
 * Avalia se um bloco de texto é provavelmente um título de pergunta.
 * Critérios:
 * 1. Deve obrigatoriamente terminar com ponto de interrogação '?'.
 * 2. Não pode conter múltiplas sentenças terminadas antes do ponto final (evita respostas longas
 *    que contêm uma pergunta no meio ou no final do parágrafo).
 * 
 * @param {string} textoBloco - Parágrafo a ser avaliado.
 * @returns {boolean} True se for uma pergunta válida.
 */
function ehProvavelPergunta(textoBloco) {
  const t = textoBloco.trim();

  // Sinal 1 (Obrigatório): Deve terminar com '?'
  if (!t.endsWith('?')) return false;

  // Proteção: Conta pontuações de fim de frase no meio do bloco (excluindo a interrogação final)
  const textoSemPontuacaoFinal = t.slice(0, -1);
  const pontuacoesIntermediarias = (textoSemPontuacaoFinal.match(/[.!?]/g) || []).length;

  // Se houver 2 ou mais pontuações intermediárias, trata-se de um parágrafo de resposta
  // e não de um título de pergunta direto
  if (pontuacoesIntermediarias >= 2) return false;

  return true;
}

/**
 * Extrai FAQs de texto simples agrupado por parágrafos (separados por linhas em branco).
 * 
 * @param {string} texto - Texto em formato livre.
 * @returns {Array<{pergunta: string, resposta: string}>} Lista de objetos de FAQ.
 */
function analisarFaqsTextoSimples(texto) {
  // Divide o texto por uma ou mais linhas em branco
  const blocos = texto
    .split(/\n\n+/)
    .map(b => b.replace(/\n/g, ' ').trim())
    .filter(b => b.length > 0);

  if (blocos.length < 2) return [];

  const faqs = [];
  let i = 0;

  while (i < blocos.length) {
    if (ehProvavelPergunta(blocos[i])) {
      const pergunta = blocos[i];
      const partesResposta = [];
      i++;

      // Agrupa todos os blocos seguintes que não sejam perguntas como resposta
      while (i < blocos.length && !ehProvavelPergunta(blocos[i])) {
        partesResposta.push(blocos[i]);
        i++;
      }

      if (partesResposta.length > 0) {
        faqs.push(finalizarFaq({ pergunta: pergunta, resposta: partesResposta.join(' ') }));
      }
    } else {
      i++; // Pula blocos que não se ajustam ao padrão
    }
  }
  return faqs;
}

// ===== 8. ROTEADOR PRINCIPAL DE ANÁLISE (PARSER ROUTER) =====
/**
 * Normaliza as quebras de linha (Windows \r\n -> \n), detecta o formato e executa o parser adequado.
 * 
 * @param {string} textoBruto - Entrada do usuário.
 * @returns {{faqs: Array<{pergunta: string, resposta: string}>, fmt: string}} Resultado e formato.
 */
function analisarFaqs(textoBruto) {
  // Normaliza quebras de linha do Windows (\r\n) e Macs antigos (\r)
  const textoNormalizado = textoBruto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const formato = detectarFormato(textoNormalizado);

  if (formato === 'markdown') return { faqs: analisarFaqsMarkdown(textoNormalizado), fmt: formato };
  if (formato === 'prefixed') return { faqs: analisarFaqsPrefixadas(textoNormalizado), fmt: formato };
  return { faqs: analisarFaqsTextoSimples(textoNormalizado), fmt: formato };
}

// ===== 9. HIGIENIZAÇÃO E FORMATAÇÃO DE STRINGS =====
/**
 * Remove espaços extras nas extremidades do par pergunta/resposta.
 */
function finalizarFaq(faq) {
  return {
    pergunta: faq.pergunta.trim(),
    resposta: faq.resposta.trim()
  };
}

/**
 * Escapa aspas simples para evitar quebra de sintaxe na string JavaScript gerada.
 */
function escaparParaJs(str) {
  return str.replace(/\\'/g, "'").replace(/'/g, "\\'");
}

/**
 * Envolve a pergunta com a tag <h2> se ainda não possuir.
 */
function envolverPergunta(texto) {
  if (/^<h2>/i.test(texto.trim())) return texto.trim();
  return `<h2>${texto.trim()}</h2>`;
}

/**
 * Envolve a resposta com a tag <p> se ainda não iniciar por uma tag de bloco (p, ul, ol, div).
 */
function envolverResposta(texto) {
  const possuiTagDeBloco = /^<(p|ul|ol|div|blockquote)/i.test(texto.trim());
  if (possuiTagDeBloco) return texto.trim();
  return `<p>${texto.trim()}</p>`;
}

// ===== 10. GERAÇÃO DO CÓDIGO DA TRAY =====
/**
 * Função principal acionada ao clicar no botão "Gerar Código".
 * Valida os dados, processa o texto, gera a estrutura de array JS da Tray e exibe na tela.
 */
function gerarCodigo() {
  const idCategoria = document.getElementById('categoryId').value.trim();
  const textoBruto = entradaFaq.value.trim();
  const caixaErro = document.getElementById('errorBox');
  const secaoSaida = document.getElementById('outputSection');
  const botaoGerar = document.getElementById('generateBtn');

  // Oculta estados anteriores
  caixaErro.style.display = 'none';
  secaoSaida.style.display = 'none';

  // Validação dos campos obrigatórios
  if (!idCategoria) {
    exibirErro('Por favor, insira o número da categoria.');
    return;
  }
  if (!textoBruto) {
    exibirErro('Por favor, cole o conteúdo das FAQs no campo acima.');
    return;
  }

  // Ativa animação de carregamento no botão
  botaoGerar.classList.add('loading');
  botaoGerar.disabled = true;

  // Processa com um pequeno atraso para feedback visual fluído
  setTimeout(() => {
    const { faqs, fmt } = analisarFaqs(textoBruto);

    // Se nenhuma FAQ for detectada, exibe mensagem explicativa
    if (faqs.length === 0) {
      botaoGerar.classList.remove('loading');
      botaoGerar.disabled = false;
      exibirErro('Nenhuma FAQ detectada. Cole o texto com perguntas e respostas separadas por linha em branco, ou use Markdown com "---" após cada pergunta.');
      return;
    }

    // Mapeamento do nome do formato para exibição na badge
    const rotulosFormato = {
      markdown: 'Markdown',
      plain: 'Texto simples',
      prefixed: 'P:/R:'
    };
    const rotuloExibido = rotulosFormato[fmt] || 'Texto simples';

    // Monta o array JavaScript no formato exato exigido pelo CMS Tray
    const linhasCodigo = [];
    linhasCodigo.push(`${idCategoria}: [`);

    faqs.forEach((faq, indice) => {
      const perguntaFormatada = envolverPergunta(faq.pergunta);
      const respostaFormatada = envolverResposta(faq.resposta);
      const ehUltimoItem = indice === faqs.length - 1;

      linhasCodigo.push(`    {`);
      linhasCodigo.push(`        pergunta: '${escaparParaJs(perguntaFormatada)}',`);
      linhasCodigo.push(`        resposta: '${escaparParaJs(respostaFormatada)}' `);
      linhasCodigo.push(ehUltimoItem ? `    }` : `    },`);
    });

    linhasCodigo.push(`  ],`);

    // Injeta o código gerado nos elementos da interface
    document.getElementById('outputCode').textContent = linhasCodigo.join('\n');
    document.getElementById('faqBadge').textContent = `${faqs.length} FAQ${faqs.length > 1 ? 's' : ''} gerada${faqs.length > 1 ? 's' : ''}`;
    document.getElementById('formatBadge').textContent = rotuloExibido;
    secaoSaida.style.display = 'block';

    // Rola a tela suavemente até a seção do código gerado
    setTimeout(() => secaoSaida.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);

    // Restaura o botão de geração
    botaoGerar.classList.remove('loading');
    botaoGerar.disabled = false;
  }, 300);
}

// ===== 11. UTILITÁRIOS DA INTERFACE =====
/**
 * Copia o código gerado para a área de transferência do usuário.
 */
async function copiarCodigo() {
  const codigo = document.getElementById('outputCode').textContent;
  const botaoCopiar = document.getElementById('copyBtn');

  try {
    await navigator.clipboard.writeText(codigo);
    const htmlOriginal = botaoCopiar.innerHTML;
    botaoCopiar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Copiado!`;
    botaoCopiar.classList.add('copied');
    setTimeout(() => {
      botaoCopiar.innerHTML = htmlOriginal;
      botaoCopiar.classList.remove('copied');
    }, 2500);
  } catch (e) {
    // Fallback de cópia para navegadores antigos sem suporte a navigator.clipboard
    const elementoTemporario = document.createElement('textarea');
    elementoTemporario.value = codigo;
    elementoTemporario.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(elementoTemporario);
    elementoTemporario.select();
    document.execCommand('copy');
    document.body.removeChild(elementoTemporario);
    
    botaoCopiar.textContent = 'Copiado!';
    setTimeout(() => {
      botaoCopiar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar código`;
      botaoCopiar.classList.remove('copied');
    }, 2500);
  }
}

/**
 * Reseta todos os campos do formulário para o estado inicial.
 */
function limparTudo() {
  document.getElementById('categoryId').value = '';
  entradaFaq.value = '';
  contadorFaq.textContent = '0 FAQs detectadas';
  contadorFaq.classList.remove('has-faqs');
  document.getElementById('errorBox').style.display = 'none';
  document.getElementById('outputSection').style.display = 'none';
  document.getElementById('categoryId').focus();
}

/**
 * Exibe a caixa de mensagem de erro com scroll suave.
 * 
 * @param {string} mensagem - Texto do erro a ser exibido.
 */
function exibirErro(mensagem) {
  const caixaErro = document.getElementById('errorBox');
  document.getElementById('errorMsg').textContent = mensagem;
  caixaErro.style.display = 'flex';
  caixaErro.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== 12. COMPATIBILIDADE E ATALHOS DE TECLADO =====
// Atalho global: Ctrl+Enter ou Cmd+Enter dispara a geração do código
document.addEventListener('keydown', (evento) => {
  if ((evento.ctrlKey || evento.metaKey) && evento.key === 'Enter') {
    gerarCodigo();
  }
});

// Alias em inglês para manter total compatibilidade com HTMLs/scripts antigos
window.generateCode = gerarCodigo;
window.copyCode = copiarCodigo;
window.clearAll = limparTudo;
window.parseFaqs = analisarFaqs;
