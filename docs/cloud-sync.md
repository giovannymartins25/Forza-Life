# Horizon Life: configuração do save na nuvem

## Arquitetura

O IndexedDB `horizon_life_db` continua preservado como armazenamento local e suporte offline. O banco central contém **um snapshot JSON completo por conta** (formato do backup v8: carreira/configurações, transações, garagem e eventos, contas, rideshare, CLT, imóveis, contratos e pagamentos, negócios e aluguéis novos). O snapshot preserva os IDs usados pelos serviços existentes. A aplicação observa transações IndexedDB confirmadas, espera 900 ms para agrupar gravações relacionadas e envia o backup completo.

O snapshot possui revisão crescente no servidor. Uma função PostgreSQL faz compare-and-swap atômico: grava somente se a revisão ainda for a esperada. Uma sessão concorrente nunca mescla saldos ou escreve por cima de uma revisão desconhecida; o aplicativo para e pede ao jogador que escolha a versão. As sessões conectadas consultam revisões a cada 15 segundos. A última revisão confirmada e um hash SHA-256 do snapshot ficam em metadados locais pequenos (não guardam saldo nem registros); após reabrir, o app só baixa uma revisão remota nova automaticamente se o IndexedDB ainda corresponder exatamente a esse hash. Sem metadados, ou se a cópia local divergir, pede escolha explícita. Isso evita mesclagem financeira insegura. O app continua local se a nuvem falhar e mostra erro; as gravações permanecem no IndexedDB.

Autenticação usa os endpoints oficiais de Auth e PostgREST do Supabase com `fetch` e a chave pública (anon/publishable). Não foi adicionada a dependência `supabase-js`: o registry de pacotes não respondeu neste ambiente, então a instalação ficou pendente; o cliente HTTP implementa renovação da sessão e compare-and-swap usados por este fluxo. Nunca configure `service_role` ou segredo administrativo no frontend. RLS limita leitura a `auth.uid()`; INSERT/UPDATE diretos são revogados e somente a função RPC pode gravar. A RPC é `SECURITY DEFINER`, tem `search_path` vazio e deriva o proprietário exclusivamente de `auth.uid()` antes de aplicar o compare-and-swap. A tabela não contém um registro compartilhado para visitantes.

## Configurar Supabase

1. Em [supabase.com](https://supabase.com/), crie uma conta/organização se necessário e selecione **New project**. Informe nome, senha forte do banco e região próxima aos jogadores; espere o projeto ficar ativo. A senha do banco é administrativa e não é usada no frontend.
2. No projeto, abra SQL Editor → New query e execute o conteúdo de [202610120001_cloud_save.sql](../supabase/migrations/202610120001_cloud_save.sql). A migração é aditiva: cria a tabela e a RPC, configura RLS e não remove dados locais. Não precisa criar tabelas manualmente.
3. Em Authentication → Providers, confirme que Email está habilitado. Em Authentication → URL Configuration, defina a URL de Production como Site URL e permita essa URL exata em Redirect URLs. Para confirmação de e-mail, mantenha o template apontando para Site URL; o jogador confirma o e-mail e depois entra manualmente no app. Se também usar previews, permita apenas os endereços específicos que pretende usar.
4. Encontre os valores no projeto em Project Settings → API (ou API Keys): **Project URL** e uma chave pública **Publishable** (`sb_publishable_...`) ou a chave legada **anon/public**. Não use `service_role`, `secret` (`sb_secret_...`), senha do banco ou token pessoal. URL e chave pública ficam visíveis no bundle do navegador e são protegidas pela autenticação e RLS.
5. Copie `.env.example` para `.env.local` na raiz durante desenvolvimento e substitua os valores:

   ```env
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_ANON_OU_PUBLISHABLE
   ```

6. Na Vercel, abra o projeto existente → Settings → Environment Variables. Cadastre as mesmas duas variáveis para Production (e Preview/Development somente se forem usar esses ambientes), sem aspas. Não cadastre chave service-role. Faça Redeploy depois de salvar as variáveis. Reinicie `npm run dev` local após editar `.env.local`; esse arquivo é ignorado pelo Git e não deve ser enviado ao repositório.
7. Com as variáveis ausentes a interface informa que a nuvem não está configurada. A tela de configurações também mostra o estado de conexão e sincronização.

## Primeiro uso e importação do celular

1. Antes de começar, abra Horizon Life no celular que contém o progresso e baixe também um backup JSON pelo módulo de backup existente. Não limpe o armazenamento do navegador. Use o mesmo endereço Vercel/domínio publicado que já contém esse IndexedDB; `localhost`, Preview e Production têm armazenamentos de navegador separados.
2. Configure e publique a versão com Supabase. No celular, abra Configurações → Save entre dispositivos e crie a conta. Confirme o e-mail, se solicitado, volte ao app publicado e entre. Use o mesmo e-mail no PC.
3. Se a conta não tiver save remoto, escolha **Enviar este save local para a nuvem**. A aplicação baixa uma cópia JSON antes do envio e só mostra sincronizado após confirmação do servidor.
4. Se já houver save remoto diferente, a tela oferece escolher a nuvem neste dispositivo ou manter o save local e substituir a nuvem. Ambas as opções baixam primeiro o save local como JSON. Não existe mesclagem automática de saldos, transações, obrigações ou contratos.
5. No PC, entre na mesma conta. Um dispositivo sem progresso local recebe automaticamente o snapshot existente. Uma cópia local antiga que corresponda à última revisão confirmada também recebe a revisão mais recente automaticamente, inclusive após fechar e reabrir. Se houver progresso local diferente ou não houver metadados que comprovem que ele era a cópia sincronizada, será pedida uma escolha explícita.

## Tutorial de sincronização entre celular e PC

1. No Supabase, crie o projeto, aguarde o status ficar ativo e anote a URL e a chave pública. Em Authentication → Providers, deixe Email habilitado. Em Authentication → URL Configuration, ajuste Site URL para a URL de Production do Horizon Life; permita essa URL exata em Redirect URLs. Se usar um endereço local para testes, permita também `http://localhost:5173/**`; adicione cada domínio Preview Vercel usado apenas se realmente testar nele. A tela atual confirma e-mail e depois faz login manual; ela não depende de callback OAuth.
2. No SQL Editor, rode `supabase/migrations/202610120001_cloud_save.sql`. Confirme em Table Editor que `horizon_saves` existe e está vazia. As políticas deixam o usuário ler somente sua própria linha; INSERT/UPDATE diretos estão revogados e a RPC é a única rota de escrita. Não teste com `service_role`.
3. No projeto local, copie `.env.example` para `.env.local` e troque os dois valores pelos do projeto real. Para encontrar: Supabase → Project Settings → API (ou API Keys), copie Project URL e uma Publishable key (`sb_publishable_...`) ou a chave legada `anon` pública. Não copie `service_role` nem `secret` (`sb_secret_...`). Essas duas variáveis `VITE_` são incluídas no bundle do frontend e por isso devem conter somente URL e chave pública.
4. Na Vercel, abra o projeto que publica o mesmo domínio usado pelo celular, adicione as variáveis em Settings → Environment Variables para Production (e Preview se aplicável) e faça Redeploy da última versão. Confira o deploy Ready. Não crie um projeto Vercel novo e não use Preview para migrar o IndexedDB do celular.
5. Abra a URL de Production no celular antigo, baixe primeiro um backup JSON em Configurações → Exportar Backup. No painel Save entre dispositivos, crie a conta/entre e escolha **Enviar este save local para a nuvem** se a conta estiver vazia. O painel baixa outro JSON local antes de enviar. Espere aparecer **Save sincronizado**; se houver erro, não considere enviado e não limpe os dados.
6. Abra essa mesma URL de Production no PC, entre com a mesma conta. Se o PC estiver vazio ou guardar a última cópia confirmada, o app baixa o save da nuvem. Se houver dados diferentes, a tela mostra as opções: baixar a nuvem para este dispositivo (mantendo um backup JSON local) ou manter o dispositivo e substituir a nuvem (baixando cópias local e remota). Escolha a opção que preserve o save escolhido; não existe merge automático.
7. Para testar sem alterar saldo: no celular, mude o Nome do Piloto em Configurações e salve. Aguarde **Save sincronizado**. Com o PC aberto e logado, aguarde a consulta (até cerca de 15 s); a interface deve atualizar o perfil. Reabra Configurações ou recarregue a página se o campo de edição continuar mostrando o valor digitado anteriormente. Também é possível fechar e reabrir o PC: o hash local confirma que a cópia era sincronizada e permite baixar a nova revisão. Verifique o mesmo nome nos dois dispositivos.

Se os dois dispositivos alterarem o save durante a janela de sincronização, aparecerá conflito; não escolha uma versão até baixar/preservar o backup que deseja manter. Em rede indisponível, o app mantém as alterações localmente e informa erro/pendência. Ao reconectar, use **Rever saves** e resolva divergências explicitamente.

O logout preserva tanto o IndexedDB quanto o snapshot remoto. A restauração local/JSON continua disponível. Alterações feitas offline ficam no IndexedDB; quando houver divergência na reconexão, o sistema solicita resolução e não as declara sincronizadas. Falhas temporárias ao renovar ou sair preservam a sessão local para permitir nova tentativa; tokens definitivamente rejeitados pedem novo login.

## Limites operacionais

- Os testes locais validam o protocolo e o isolamento dos tokens, mas não substituem um teste de ponta a ponta no projeto Supabase real. O proprietário precisa executar o SQL, configurar Auth e variáveis Vercel e validar login em dois navegadores/dispositivos.
- As mudanças de sessão são verificadas por consulta de revisão a cada 15 s (sem canal Realtime). Conflitos entre dois saves alterados não são mesclados; é necessária uma escolha explícita após baixar backup local.
- Este formato substitui atomicamente o snapshot completo na revisão seguinte; ele não cria lançamentos financeiros no servidor separadamente. Idempotência financeira entre dispositivos é assegurada pelo compare-and-swap do save, e duplicatas existentes no próprio snapshot continuam sujeitas aos IDs/chaves dos serviços do Horizon.
- O schema de backup continua em v8. Nenhuma loja IndexedDB é apagada ou migrada por esta etapa.
