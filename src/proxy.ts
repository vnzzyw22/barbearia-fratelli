import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // "imagens/" já ficava fora do middleware; "videos/" (e as extensões de
  // vídeo) faltavam aqui — sem isso, cada requisição por pedaço do arquivo
  // (`Range requests`, é assim que o navegador carrega/dá seek num
  // `<video>`) passava pelo middleware e disparava uma chamada de
  // autenticação ao Supabase, uma por pedaço. Local (sem Supabase
  // configurado) isso não trava porque o middleware sai cedo — na Vercel,
  // com o Supabase real configurado, cada requisição de vídeo esperava
  // essa chamada de rede antes de responder, quebrando o carregamento
  // (ver ANEXO seção 4 / CLAUDE.md > Lições técnicas).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|videos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov)$).*)",
  ],
};
