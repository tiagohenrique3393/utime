type CircleError = { code?: string; message?: string } | null;

function errorText(error: CircleError) {
  return `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
}

export function circleUnavailable(error: CircleError) {
  const text = errorText(error);
  return text.includes('pgrst202') || text.includes('could not find the function') || text.includes('schema cache');
}

export function circleFailureMessage(error: CircleError, action: 'load' | 'board' | 'friends' | 'friend') {
  const text = errorText(error);
  if (text.includes('circle requirements missing')) {
    return 'A rotina ainda não tem 2 hábitos de alta, 4 de média e 4 de baixa.';
  }
  if (text.includes('friend unavailable')) {
    return 'Essa pessoa não está participando do ranking.';
  }
  if (text.includes('friend request missing')) {
    return 'Essa solicitação não está mais disponível.';
  }
  if (text.includes('self lookup')) {
    return 'Não é possível adicionar a própria conta.';
  }
  if (text.includes('invalid friend')) {
    return 'Não é possível alterar essa amizade.';
  }
  if (text.includes('lookup limited')) {
    return 'Muitas buscas em sequência. Espere alguns minutos e tente de novo.';
  }
  if (text.includes('circle enrollment required')) {
    return 'Entre no ranking para buscar e adicionar amigos.';
  }
  if (text.includes('no unique or exclusion constraint')) {
    return 'Não foi possível concluir a amizade. Execute o SQL complementar no Supabase.';
  }
  if (text.includes('auth required') || text.includes('jwt') || text.includes('session')) {
    return 'Sua sessão expirou. Entre novamente.';
  }
  if (text.includes('failed to fetch') || text.includes('network') || text.includes('timeout') || text.includes('statement timeout')) {
    return 'A conexão falhou. Tente de novo.';
  }
  if (text.includes('invalid period')) {
    return 'Não foi possível abrir este período do ranking.';
  }
  if (circleUnavailable(error)) {
    return 'O Círculo ainda não está disponível.';
  }
  if (action === 'board') {
    return 'Não foi possível carregar o ranking.';
  }
  if (action === 'friends') {
    return 'Não foi possível carregar os amigos.';
  }
  if (action === 'friend') {
    return 'Não foi possível concluir a amizade.';
  }
  return 'Não foi possível carregar o Círculo.';
}
