import type { NextConfig } from "next";

// Hostname derivado da env (não hardcoded): este é um template clonado por
// cliente, cada deployment aponta pra um projeto Supabase diferente.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Server Actions (usado no upload de foto da Galeria) limitam o corpo da
  // requisição a 1MB por padrão — menor que o limite de 5MB que o próprio
  // formulário anuncia (src/app/admin/(painel)/galeria/actions.ts). Sem
  // isso, uma foto "normal" de celular (facilmente >1MB) é rejeitada pelo
  // Next.js antes do nosso código rodar, e o botão trava em "Enviando...".
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      // Banco de imagens temporário (hero/galeria) enquanto as fotos/vídeo
      // reais da Fialho não chegam — ver ANEXO seção 2. Remover quando o
      // conteúdo real substituir os placeholders do Unsplash.
      {
        protocol: "https" as const,
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
