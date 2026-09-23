-- Migration original (Lkas Locs) trocava as fotos placeholder por 3 fotos
-- reais daquela marca (public/imagens/SaveClip.App_*.jpg, categoria
-- "locs") -- não se aplicam ao Tesouras Club Barbearia (arquivos nem
-- existem neste repo). Virou no-op nesta cópia do template; fotos reais
-- entram pelo painel administrativo (Galeria) quando disponíveis. Mantido
-- como arquivo (não apagado) só pra preservar a ordem cronológica das
-- migrations. Achado ao aplicar o SQL num projeto novo: essa migration
-- tinha passado batido na primeira auditoria de rebrand (só a
-- 20260831120000 tinha sido revisada) -- ver CLAUDE.md > Lições técnicas.
select 1;
