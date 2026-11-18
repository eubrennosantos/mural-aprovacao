# Mural de Aprovação — B.S REC

Site onde o cliente vê as postagens de cada dia (imagem, carrossel ou vídeo + legenda) e clica em **Approve** ou **Request changes**. O cliente vê tudo em inglês; o seu painel é em português.

- **Seu painel:** `/admin` (protegido por senha) — cria clientes, sobe posts, vê os comentários.
- **Link do cliente:** `/c/<código-secreto>` — cada cliente tem o seu, sem login. Quem tiver o link consegue ver e aprovar, então mande só pro cliente.

Custo: R$ 0 (Vercel Hobby + Supabase Free).

---

## 1. Supabase (5 min)

Use o mesmo projeto do Foto do Evento. As tabelas novas têm prefixo `mural_`, então não mexem em nada do outro site.

1. Abra o projeto no Supabase → **SQL Editor** → **New query**.
2. Cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Vá em **Project Settings → API** e copie:
   - Project URL
   - `anon` `public` key
   - `service_role` key (secreta, nunca coloque no código)

## 2. GitHub

Crie um repositório novo (ex.: `mural-aprovacao`) e suba esta pasta:

```bash
cd mural-aprovacao
git init
git add .
git commit -m "Mural de aprovação"
git branch -M main
git remote add origin https://github.com/eubrennosantos/mural-aprovacao.git
git push -u origin main
```

## 3. Vercel

1. **Add New → Project** → importe o repositório `mural-aprovacao`.
2. Em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `ADMIN_PASSWORD` | uma senha forte só sua |

3. **Deploy**.

## 4. Subdomínio (opcional): aprovacao.bsrec.com.br

1. Na Vercel: projeto → **Settings → Domains** → adicione `aprovacao.bsrec.com.br`.
2. A Vercel mostra o registro de DNS. Se o DNS do bsrec.com.br já está na Vercel, ela configura sozinha. Se está no Registro.br, crie lá um registro **CNAME**: nome `aprovacao` → valor `cname.vercel-dns.com`.

## 5. Uso no dia a dia

1. Entre em `/admin` com a sua senha → **Criar mural** com o nome do cliente.
2. **+ Adicionar post**: data, formato, legenda e os arquivos (em carrossel, selecione na ordem).
3. **Copiar link** e mande para o cliente.
4. Quando ele pedir ajuste: clique em **Editar**, troque o arquivo/legenda e deixe marcado **Enviar como nova versão**. O post volta para pendente, aparece como "Updated · v2" e o pedido anterior continua visível pra ele.

## Limites do plano grátis do Supabase

- **50 MB por arquivo**: exporte os Reels em 1080p com bitrate moderado.
- **1 GB de armazenamento** e **5 GB de tráfego/mês** no total do projeto (somando com o Foto do Evento). Exclua os posts de meses antigos depois que já foram publicados, pra liberar espaço; o painel apaga os arquivos junto.

## Rodar no seu computador

```bash
cp .env.example .env.local   # preencha os valores
npm install
npm run dev                  # http://localhost:3000/admin
```
