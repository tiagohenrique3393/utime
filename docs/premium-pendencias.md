# Pendências — UTime Premium (etapa visual)

Documento de acompanhamento. Não ativa cobranças nem altera o banco de produção.

## Jurídico

- Validação jurídica dos Termos de Uso (texto atual é estrutura inicial).
- Validação da Política de Privacidade com levantamento real (dados, bases legais LGPD, fornecedores, retenção, transferências).
- Identificação do responsável legal, dados empresariais, vigência e versão — sem inventar CNPJ/endereço/e-mail.
- Confirmar modalidade de renovação automática anual antes da ativação comercial.
- Publicar versões definitivas públicas para App Store / Google Play.

## RevenueCat

- Contas Apple Developer e Google Play Console.
- Produto de assinatura anual nas lojas (preço localizado; layout usa R$ 139,90 como referência BR).
- Projeto RevenueCat + API keys públicas no app (sem secretos privados).
- SDK compatível com Expo / development build.
- Webhook autenticado → Supabase para autorizar Premium no servidor (idempotente).
- `app_user_id` = `auth.users.id` imutável do Supabase (não usar e-mail).
- Separar ambiente sandbox e produção.
- Tratar cancelamentos, vencimentos, reembolsos e falhas de pagamento no servidor.

## App Store / Google Play

- Contas e apps oficiais.
- Screenshots e metadados das lojas.
- Links para Termos e Privacidade públicos.
- Política de assinatura / reembolso conforme cada loja.
- Não comercializar pelo site utime.app.br nesta etapa (sem Stripe/PIX/checkout web).

## Suporte

- Canal oficial de atendimento (e-mail ou integração) ainda não configurado no ambiente.
- A página Suporte está preparada; o envio de mensagens permanece pendente.

## Autorizações vitalícias

- Preservar concessões administrativas existentes (servidor / RPC).
- Assinatura comercial futura é independente das autorizações vitalícias.
- E-mails vitalícios no servidor: `thsouza00793@gmail.com` e `francinegodinhodossantos@gmail.com`.
- `protect_profile_plan` impede rebaixamento dessas contas mesmo via webhook/RevenueCat.
- `challenge_is_premium` e `utime_my_plan` reparam o plano na identidade autenticada.
- **Ação humana obrigatória:** reexecutar `supabase/premium-plan-rpc.sql` no SQL Editor de produção após este PR (idempotente), depois logout/login da Francine.

## Canais oficiais de loja (quando houver compra)

- Gerenciar / cancelar renovação (Apple): https://apps.apple.com/account/subscriptions
- Reembolso (Apple): https://reportaproblem.apple.com/
- Gerenciar / cancelar renovação (Google): https://play.google.com/store/account/subscriptions
- Reembolso (Google): https://support.google.com/googleplay/answer/2479637
