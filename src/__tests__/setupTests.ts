import '@testing-library/jest-dom/vitest';

// jsdom não implementa scrollIntoView, e o Radix Select chama isso ao abrir o
// SelectContent — sem o stub o componente inteiro derruba a árvore com
// "candidate?.scrollIntoView is not a function", e qualquer tela com <Select>
// fica impossível de testar. Não é mock de comportamento: é buraco do jsdom.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

// Mock para console.error, se necessário, para evitar poluir a saída do teste
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suprimir erros conhecidos ou específicos se desejar
  if (typeof args[0] === 'string' && args[0].includes('Não-react-router-dom')) {
    return;
  }
  originalConsoleError(...args);
};