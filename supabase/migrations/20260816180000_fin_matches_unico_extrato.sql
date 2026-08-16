-- fin_matches: uma linha de extrato pareia com NO MAXIMO um lancamento.
--
-- Hoje nao existe nenhuma constraint UNIQUE em fin_matches. A ausencia de
-- duplicatas medida em producao (0 hoje) e consequencia de ninguem ter repetido
-- o pareamento depois de um F5 — sorte, nao protecao. E o bug do flag `pareado`
-- (Relay 22, corrigido) era exatamente o que induzia essa repeticao: a linha
-- voltava a aparecer como nao conciliada e o operador pareava de novo.
--
-- Por que o unico e em extrato_id sozinho, e nao no par (extrato_id, lancamento_id):
-- o dominio, como implementado, e 1:1. Nao ha pagamento composto aqui.
--   * fin_extrato_linhas.pareado e um booleano por LINHA, nao um contador — nao
--     existe estado "parcialmente pareada".
--   * ConciliacaoTab trata a linha como indivisivel: `if (extrato.pareado) return`
--     no auto-match, e a linha vira nao-clicavel quando pareada. Uma segunda
--     metade nunca poderia ser pareada pela UI.
--   * removeMatch guarda pela LINHA, nao pelo match:
--     `if (state.matches.some(m => m.extratoId === match.extratoId)) return state`
--     — o codigo ja assume, explicitamente, no maximo um match por linha.
--   * O resumo conta `extratoLinhas.filter(e => e.pareado).length` contra
--     `matches.length`; com N:1 os dois numeros divergiriam.
-- Um unico em (extrato_id, lancamento_id) permitiria N lancamentos na mesma
-- linha e so barraria o par identico repetido — deixaria passar justamente a
-- duplicata que se quer impedir.
--
-- Limpeza defensiva antes do indice: se houver duplicata, mantem o match mais
-- ANTIGO (o primeiro pareamento deliberado) e remove os repetidos, que sao o
-- resultado do F5. Sem isto o CREATE UNIQUE INDEX falha e a migration trava.

DELETE FROM public.fin_matches m
WHERE EXISTS (
  SELECT 1
  FROM public.fin_matches keep
  WHERE keep.extrato_id = m.extrato_id
    AND (keep.created_at, keep.id) < (m.created_at, m.id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_matches_extrato
  ON public.fin_matches(extrato_id);

COMMENT ON INDEX public.uq_fin_matches_extrato IS
  'Uma linha de extrato pareia com no maximo um lancamento (dominio 1:1). Impede pareamento duplicado apos F5/repareamento.';
