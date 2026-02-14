import '@testing-library/jest-dom/vitest';

// Mock para console.error, se necessário, para evitar poluir a saída do teste
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suprimir erros conhecidos ou específicos se desejar
  if (args[0].includes('Não-react-router-dom')) {
    return;
  }
  originalConsoleError(...args);
};