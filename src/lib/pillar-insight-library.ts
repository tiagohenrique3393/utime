import type { PillarId } from '@/lib/pillar-balance';

export type InsightPeriod = 'dia' | 'semana' | 'mes' | 'ano';

export type InsightCategory =
  | 'corpo-evolucao'
  | 'mente-evolucao'
  | 'espirito-evolucao'
  | 'corpo-atencao'
  | 'mente-atencao'
  | 'espirito-atencao'
  | 'equilibrados'
  | 'desequilibrio'
  | 'recuperacao'
  | 'melhora-progressiva'
  | 'conquistas'
  | 'inicio'
  | 'dados-insuficientes'
  | 'orientacao-diaria'
  | 'reflexao-semanal'
  | 'analise-mensal'
  | 'reflexao-anual';

export type InsightRule =
  | { kind: 'insufficient' }
  | { kind: 'start' }
  | { kind: 'balanced' }
  | { kind: 'gap'; high: PillarId; low: PillarId }
  | { kind: 'attention'; pillar: PillarId }
  | { kind: 'evolving'; pillar: PillarId }
  | { kind: 'recovery' }
  | { kind: 'progress' }
  | { kind: 'milestone' }
  | { kind: 'two-up'; behind: PillarId }
  | { kind: 'reflection'; period: InsightPeriod; closed?: boolean };

export type InsightDraft = {
  id: string;
  category: InsightCategory;
  periods: readonly InsightPeriod[];
  priority: number;
  insight: string;
  action: string;
  rule: InsightRule;
};

const allPeriods: readonly InsightPeriod[] = ['dia', 'semana', 'mes', 'ano'];
const visualPeriods: readonly InsightPeriod[] = ['semana', 'mes', 'ano'];

function item(
  id: string,
  category: InsightCategory,
  periods: readonly InsightPeriod[],
  priority: number,
  rule: InsightRule,
  insight: string,
  action: string,
): InsightDraft {
  return { id, category, periods, priority, insight, action, rule };
}

export const insightLibrary: readonly InsightDraft[] = [
  item('insuf-01', 'dados-insuficientes', allPeriods, 100, { kind: 'insufficient' }, 'Ainda não há registros suficientes neste período para ler o equilíbrio dos três pilares.', 'Registre um hábito em cada pilar quando ele fizer parte do seu dia.'),
  item('insuf-02', 'dados-insuficientes', allPeriods, 100, { kind: 'insufficient' }, 'O mapa permanece no ponto de partida enquanto os três pilares não tiverem registros.', 'Comece por um hábito curto, fácil de repetir.'),
  item('insuf-03', 'dados-insuficientes', allPeriods, 100, { kind: 'insufficient' }, 'Sem histórico neste período, o UTime ainda não consegue reconhecer um padrão.', 'Uma conclusão real já muda a leitura.'),
  item('insuf-04', 'dados-insuficientes', visualPeriods, 100, { kind: 'insufficient' }, 'Falta registro em pelo menos um pilar. A média dos três espera esse dado.', 'Escolha o pilar sem hábito e cadastre um cuidado simples.'),
  item('insuf-05', 'dados-insuficientes', ['semana'], 100, { kind: 'insufficient' }, 'Esta semana ainda não tem base para uma leitura justa dos três pilares.', 'Use os próximos dias para registrar o que você de fato fizer.'),
  item('insuf-06', 'dados-insuficientes', ['mes'], 100, { kind: 'insufficient' }, 'Este mês ainda não reuniu registros suficientes para mostrar o equilíbrio.', 'Não é uma falha: o mês ainda pode ganhar os primeiros dados.'),
  item('insuf-07', 'dados-insuficientes', ['ano'], 100, { kind: 'insufficient' }, 'O ano ainda não tem registros suficientes para uma leitura dos três pilares.', 'O histórico começa no dia em que o primeiro hábito é concluído.'),
  item('insuf-08', 'dados-insuficientes', allPeriods, 100, { kind: 'insufficient' }, 'Você começou a usar o UTime. Os percentuais aparecem quando os hábitos passam a ser registrados.', 'Complete os primeiros hábitos para que seus padrões fiquem visíveis.'),

  item('inicio-01', 'inicio', visualPeriods, 90, { kind: 'start' }, 'Você começou a sua jornada. Os próximos hábitos concluídos ajudam a identificar seus padrões.', 'Repita um hábito pequeno nos próximos dias.'),
  item('inicio-02', 'inicio', visualPeriods, 90, { kind: 'start' }, 'Os três pilares ainda estão perto do início. Isso é ponto de partida, não um julgamento.', 'Escolha uma ação que caiba no seu dia de amanhã.'),
  item('inicio-03', 'inicio', visualPeriods, 90, { kind: 'start' }, 'Há poucos dias registrados e o ritmo ainda é curto. A leitura fica mais útil com repetição.', 'Mantenha o mesmo hábito por mais alguns dias.'),
  item('inicio-04', 'inicio', ['semana'], 90, { kind: 'start' }, 'A semana está no começo da coleta. Ainda é cedo para cravar um padrão.', 'Feche hoje um hábito que você já sabe fazer.'),
  item('inicio-05', 'inicio', ['mes'], 90, { kind: 'start' }, 'O mês mal começou a ser registrado. O equilíbrio vai aparecer com os dias seguintes.', 'Não amplie a lista: cumpra o que já está cadastrado.'),
  item('inicio-06', 'inicio', ['ano'], 90, { kind: 'start' }, 'O ano ainda mostra só os primeiros passos. O que se repete agora vira a base lá na frente.', 'Proteja um horário curto para um dos pilares.'),
  item('inicio-07', 'inicio', visualPeriods, 90, { kind: 'start' }, 'Seus percentuais ainda são baixos porque o histórico é recente. O próximo registro já move o mapa.', 'Conclua hoje o hábito mais simples de cada pilar que existir.'),
  item('inicio-08', 'inicio', visualPeriods, 90, { kind: 'start' }, 'A jornada está aberta. Pequenas conclusões valem mais do que uma meta grande demais.', 'Reduza o plano de amanhã a uma ação só, e faça essa.'),

  item('corpo-evo-01', 'corpo-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'corpo' }, 'Seu Corpo está à frente dos outros pilares. O ritmo físico já sustenta a leitura deste período.', 'Escolha um cuidado do corpo que você consegue repetir sem aumentar a carga.'),
  item('corpo-evo-02', 'corpo-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'corpo' }, 'O Corpo puxou o período. Movimento, cuidado ou rotina física estão mais presentes que o resto.', 'Mantenha o que funcionou e não troque o hábito no meio do caminho.'),
  item('corpo-evo-03', 'corpo-evolucao', ['semana'], 74, { kind: 'evolving', pillar: 'corpo' }, 'Nesta semana o Corpo avançou mais que Mente e Espírito. É um sinal de constância, não de pressa.', 'Repita o mesmo hábito de corpo nos dias que ainda faltam.'),
  item('corpo-evo-04', 'corpo-evolucao', ['mes'], 74, { kind: 'evolving', pillar: 'corpo' }, 'No mês, o Corpo é o pilar mais firme. Vale proteger esse horário antes de abrir frente nova.', 'Deixe o hábito de corpo no mesmo período do dia.'),
  item('corpo-evo-05', 'corpo-evolucao', ['ano'], 74, { kind: 'evolving', pillar: 'corpo' }, 'No acumulado do ano, o Corpo é o pilar que mais se sustentou.', 'Use esse hábito como âncora e não como prova de intensidade.'),
  item('corpo-evo-06', 'corpo-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'corpo' }, 'Há um avanço claro no Corpo. O próximo ganho não precisa ser mais esforço: precisa caber na rotina.', 'Conserve o hábito físico que você já conseguiu cumprir.'),
  item('corpo-evo-07', 'corpo-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'corpo' }, 'Seu cuidado com o corpo está visível nos registros. Isso já é um padrão, não um dia isolado.', 'Não some tarefas novas ao corpo esta semana.'),
  item('corpo-evo-08', 'corpo-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'corpo' }, 'O Corpo responde quando a ação é repetida. A leitura atual confirma esse movimento.', 'Mantenha a mesma dose de movimento que já está dando certo.'),

  item('mente-evo-01', 'mente-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'mente' }, 'Sua Mente está à frente neste período. Estudo, leitura ou organização já pesam nos registros.', 'Reserve o mesmo intervalo curto para continuar esse hábito.'),
  item('mente-evo-02', 'mente-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'mente' }, 'A Mente puxou o equilíbrio. O que você treinou de atenção está mais firme que os outros pilares.', 'Não alongue a sessão: preserve a que você já completa.'),
  item('mente-evo-03', 'mente-evolucao', ['semana'], 74, { kind: 'evolving', pillar: 'mente' }, 'Nesta semana a Mente avançou mais. É um bom momento para manter o bloco de foco, sem ampliá-lo.', 'Proteja um horário de leitura ou estudo já cadastrado.'),
  item('mente-evo-04', 'mente-evolucao', ['mes'], 74, { kind: 'evolving', pillar: 'mente' }, 'No mês, a Mente é o pilar mais consistente. O ganho está na repetição, não na quantidade de temas.', 'Fique em um assunto só até o fim do mês.'),
  item('mente-evo-05', 'mente-evolucao', ['ano'], 74, { kind: 'evolving', pillar: 'mente' }, 'No ano, a Mente acumulou mais presença que Corpo e Espírito.', 'Continue o hábito mental que já sobrevive à sua semana real.'),
  item('mente-evo-06', 'mente-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'mente' }, 'Há avanço nítido na Mente. Uma prática curta, feita de novo, segura esse resultado.', 'Reabra o hábito de mente no próximo bloco livre do dia.'),
  item('mente-evo-07', 'mente-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'mente' }, 'Seus registros de Mente mostram constância acima dos outros pilares.', 'Mantenha o formato atual em vez de buscar um método novo.'),
  item('mente-evo-08', 'mente-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'mente' }, 'A Mente está em evolução visível. O passo útil é repetir a mesma ação, não colecionar técnicas.', 'Faça hoje a versão mais curta do hábito de mente.'),

  item('espirito-evo-01', 'espirito-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'espirito' }, 'Seu Espírito está à frente neste período. Reflexão, presença ou gratidão já aparecem com mais firmeza.', 'Guarde alguns minutos do mesmo horário para repetir essa prática.'),
  item('espirito-evo-02', 'espirito-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'espirito' }, 'O Espírito puxou a leitura. Há mais regularidade interior do que nos outros pilares.', 'Não transforme a prática em meta longa: mantenha a duração que cabe.'),
  item('espirito-evo-03', 'espirito-evolucao', ['semana'], 74, { kind: 'evolving', pillar: 'espirito' }, 'Nesta semana o Espírito avançou mais que Corpo e Mente.', 'Repita a reflexão ou a atenção a alguém nos dias que faltam.'),
  item('espirito-evo-04', 'espirito-evolucao', ['mes'], 74, { kind: 'evolving', pillar: 'espirito' }, 'No mês, o Espírito é o pilar mais presente. Isso costuma vir de um gesto pequeno feito várias vezes.', 'Conserve o minuto de presença que você já consegue cumprir.'),
  item('espirito-evo-05', 'espirito-evolucao', ['ano'], 74, { kind: 'evolving', pillar: 'espirito' }, 'No ano, o Espírito sustentou mais registros que os outros pilares.', 'Mantenha essa prática como parte ordinária do dia, não como exceção.'),
  item('espirito-evo-06', 'espirito-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'espirito' }, 'Há um avanço claro no Espírito. Silêncio, gratidão ou cuidado com alguém está deixando marca.', 'Escolha um momento fixo e curto para continuar.'),
  item('espirito-evo-07', 'espirito-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'espirito' }, 'Seu pilar espiritual está mais estável que o restante. O valor está na continuidade.', 'Não acrescente outra prática enquanto esta seguir viva.'),
  item('espirito-evo-08', 'espirito-evolucao', visualPeriods, 74, { kind: 'evolving', pillar: 'espirito' }, 'O Espírito responde ao que é repetido em silêncio. A leitura deste período confirma isso.', 'Dedique hoje os mesmos minutos de ontem, sem ampliar.'),

  item('corpo-at-01', 'corpo-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'corpo' }, 'Seu Corpo está atrás dos outros pilares. Um cuidado físico curto muda mais do que um plano intenso.', 'Retome um hábito de movimento ou de cuidado do corpo.'),
  item('corpo-at-02', 'corpo-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'corpo' }, 'A leitura pede atenção ao Corpo. Ele ficou abaixo de Mente e Espírito neste período.', 'Escolha o hábito de corpo mais simples já cadastrado e faça só esse.'),
  item('corpo-at-03', 'corpo-atencao', ['semana'], 76, { kind: 'attention', pillar: 'corpo' }, 'Nesta semana o Corpo ficou para trás. Ainda há dias para retomar sem compensar em excesso.', 'Faça uma versão menor do hábito físico nos próximos dias.'),
  item('corpo-at-04', 'corpo-atencao', ['mes'], 76, { kind: 'attention', pillar: 'corpo' }, 'No mês, o Corpo é o pilar mais baixo. A correção útil é reabrir a rotina, não dobrar a meta.', 'Volte ao horário em que o cuidado do corpo já aconteceu antes.'),
  item('corpo-at-05', 'corpo-atencao', ['ano'], 76, { kind: 'attention', pillar: 'corpo' }, 'No acumulado do ano, o Corpo pede mais presença. O ajuste é de frequência, não de heroísmo.', 'Marque dois dias próximos para o hábito de corpo que já existe.'),
  item('corpo-at-06', 'corpo-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'corpo' }, 'O Corpo perdeu espaço enquanto os outros pilares seguiram. Retomar um gesto basta para reabrir o eixo.', 'Cumpra hoje uma ação física que leve poucos minutos.'),
  item('corpo-at-07', 'corpo-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'corpo' }, 'Seu equilíbrio melhora se o Corpo deixar de ser o pilar esquecido.', 'Religue o hábito de corpo à parte do dia em que você já está de pé.'),
  item('corpo-at-08', 'corpo-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'corpo' }, 'Há uma diferença clara: o Corpo está mais baixo. Trate isso como um ajuste, não como dívida.', 'Retome movimento, refeição ou higiene — o que já estiver na sua lista.'),

  item('mente-at-01', 'mente-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'mente' }, 'Sua Mente está atrás dos outros pilares. Um momento curto de estudo ou leitura já reabre esse eixo.', 'Reserve um momento para leitura ou para organizar o dia.'),
  item('mente-at-02', 'mente-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'mente' }, 'A Mente ficou abaixo de Corpo e Espírito. O período pede atenção, não uma grade nova de cursos.', 'Reabra o hábito mental mais curto que você já cadastrou.'),
  item('mente-at-03', 'mente-atencao', ['semana'], 76, { kind: 'attention', pillar: 'mente' }, 'Nesta semana a Mente ficou para trás. Um bloco pequeno nos próximos dias corrige o rumo.', 'Separe dez minutos para o hábito de mente antes de encerrar o dia.'),
  item('mente-at-04', 'mente-atencao', ['mes'], 76, { kind: 'attention', pillar: 'mente' }, 'No mês, a Mente é o pilar mais baixo. Constância curta vale mais do que uma maratona tardia.', 'Escolha um único tema e volte a ele amanhã.'),
  item('mente-at-05', 'mente-atencao', ['ano'], 76, { kind: 'attention', pillar: 'mente' }, 'No ano, a Mente acumulou menos presença. O ajuste é recolocar esse hábito na semana real.', 'Defina um dia fixo para estudo ou leitura e cumpra só esse.'),
  item('mente-at-06', 'mente-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'mente' }, 'O mapa mostra a Mente pedindo espaço. Aprender pouco, de novo, é o caminho compatível com os dados.', 'Retome o hábito de mente que já está na sua lista.'),
  item('mente-at-07', 'mente-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'mente' }, 'Sua Mente não acompanhou os outros pilares. Não compense com pressa: recomece pelo menor passo.', 'Anote uma prioridade e faça o primeiro trecho dela.'),
  item('mente-at-08', 'mente-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'mente' }, 'Há folga nos outros pilares e atraso na Mente. Esse é o ajuste mais útil agora.', 'Abra uma página, uma aula ou a lista de prioridades — e pare no combinado.'),

  item('espirito-at-01', 'espirito-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'espirito' }, 'Seu Espírito está atrás dos outros pilares. Alguns minutos de reflexão já alteram essa leitura.', 'Dedique alguns minutos à reflexão ou à gratidão.'),
  item('espirito-at-02', 'espirito-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'espirito' }, 'O Espírito ficou abaixo de Corpo e Mente. O período pede presença, não uma prática elaborada.', 'Reabra o hábito de espírito mais simples da sua lista.'),
  item('espirito-at-03', 'espirito-atencao', ['semana'], 76, { kind: 'attention', pillar: 'espirito' }, 'Nesta semana o Espírito ficou para trás. Ainda dá para incluir um gesto breve nos próximos dias.', 'Reserve um fim de dia para silêncio ou para alguém importante.'),
  item('espirito-at-04', 'espirito-atencao', ['mes'], 76, { kind: 'attention', pillar: 'espirito' }, 'No mês, o Espírito é o pilar mais baixo. Um minuto repetido corrige mais do que um recolhimento longo adiado.', 'Escolha um horário fixo e curto para a prática que já existe.'),
  item('espirito-at-05', 'espirito-atencao', ['ano'], 76, { kind: 'attention', pillar: 'espirito' }, 'No ano, o Espírito acumulou menos registros. A prioridade é recolocar essa prática na vida ordinária.', 'Ligue o hábito de espírito a algo que você já faz todo dia.'),
  item('espirito-at-06', 'espirito-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'espirito' }, 'O equilíbrio pede mais Espírito. Reflexão, atenção ou gratidão estão raros nos registros.', 'Faça hoje a versão mais curta dessa prática.'),
  item('espirito-at-07', 'espirito-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'espirito' }, 'Corpo e Mente seguiram sem o Espírito na mesma medida. O ajuste é pequeno e concreto.', 'Dedique atenção a uma pessoa ou registre uma gratidão real.'),
  item('espirito-at-08', 'espirito-atencao', visualPeriods, 76, { kind: 'attention', pillar: 'espirito' }, 'Seu Espírito está mais baixo. Trate isso como um espaço vazio na rotina, não como falha pessoal.', 'Volte ao hábito de espírito que você já reconhece como seu.'),

  item('equil-01', 'equilibrados', visualPeriods, 66, { kind: 'balanced' }, 'Os três pilares estão próximos. Seu equilíbrio vem de cuidar dos três, sem privilegiar só um.', 'Mantenha a mesma medida nos três até o fim do período.'),
  item('equil-02', 'equilibrados', visualPeriods, 66, { kind: 'balanced' }, 'Corpo, Mente e Espírito caminham juntos nesta leitura. Esse alinhamento é o dado mais importante agora.', 'Não acelere um pilar à custa dos outros.'),
  item('equil-03', 'equilibrados', ['semana'], 66, { kind: 'balanced' }, 'A semana está equilibrada. O trabalho útil é repetir o que já mantém os três pilares perto.', 'Conserve os hábitos que você conseguiu cumprir nos três.'),
  item('equil-04', 'equilibrados', ['mes'], 66, { kind: 'balanced' }, 'O mês mostra pilares próximos. Mais importante que acelerar é conseguir manter o ritmo.', 'Siga até o fim do mês sem abrir uma meta nova.'),
  item('equil-05', 'equilibrados', ['ano'], 66, { kind: 'balanced' }, 'No ano, os três pilares permaneceram próximos. Isso é mudança de comportamento, não um pico.', 'Escolha manter o piso atual nos próximos meses.'),
  item('equil-06', 'equilibrados', visualPeriods, 66, { kind: 'balanced' }, 'Há equilíbrio real entre os pilares. Pequenas ações repetidas estão segurando os três.', 'Proteja o hábito mais frágil, mesmo que a diferença seja pequena.'),
  item('equil-07', 'equilibrados', visualPeriods, 66, { kind: 'balanced' }, 'Nenhum pilar destoa de forma relevante. A leitura recomenda continuidade, não correção.', 'Repita amanhã o que você fez hoje nos três.'),
  item('equil-08', 'equilibrados', visualPeriods, 66, { kind: 'balanced' }, 'Seu equilíbrio está estável. O risco agora é abandonar um pilar para intensificar outro.', 'Deixe a próxima ação tão simples quanto a que já funciona.'),

  item('gap-01', 'desequilibrio', visualPeriods, 80, { kind: 'gap', high: 'corpo', low: 'espirito' }, 'Seu Corpo está à frente e o Espírito ficou para trás. O ajuste é uma prática breve de presença.', 'Dedique alguns minutos à reflexão antes de encerrar o dia.'),
  item('gap-02', 'desequilibrio', visualPeriods, 80, { kind: 'gap', high: 'corpo', low: 'mente' }, 'Seu Corpo avançou, mas a Mente ficou para trás. Falta um momento de estudo, leitura ou prioridade.', 'Reserve um momento do dia para aprender algo ou organizar o que importa.'),
  item('gap-03', 'desequilibrio', visualPeriods, 80, { kind: 'gap', high: 'mente', low: 'corpo' }, 'Sua Mente está à frente e o Corpo ficou para trás. O próximo cuidado é físico e curto.', 'Retome um hábito de movimento ou de cuidado do corpo.'),
  item('gap-04', 'desequilibrio', visualPeriods, 80, { kind: 'gap', high: 'mente', low: 'espirito' }, 'Sua Mente avançou mais que o Espírito. Falta o minuto de presença que equilibra o período.', 'Inclua uma reflexão curta ou um gesto de atenção a alguém.'),
  item('gap-05', 'desequilibrio', visualPeriods, 80, { kind: 'gap', high: 'espirito', low: 'corpo' }, 'Seu Espírito está à frente e o Corpo ficou para trás. A prática interior não substitui o cuidado físico.', 'Reabra um hábito simples de corpo nos próximos dias.'),
  item('gap-06', 'desequilibrio', visualPeriods, 80, { kind: 'gap', high: 'espirito', low: 'mente' }, 'Seu Espírito avançou, mas a Mente ficou para trás. O ajuste é um bloco curto de foco.', 'Volte ao hábito de leitura, estudo ou prioridades.'),
  item('gap-07', 'desequilibrio', visualPeriods, 80, { kind: 'gap', high: 'corpo', low: 'espirito' }, 'A distância entre Corpo e Espírito está grande. Evoluir só o corpo deixa o mapa torto.', 'Escolha uma ação de espírito que leve menos de cinco minutos.'),
  item('gap-08', 'desequilibrio', visualPeriods, 80, { kind: 'gap', high: 'mente', low: 'corpo' }, 'A distância entre Mente e Corpo chama atenção. Ideia sem cuidado físico não sustenta o período.', 'Faça a menor versão do hábito de corpo que já está cadastrado.'),

  item('recup-01', 'recuperacao', visualPeriods, 86, { kind: 'recovery' }, 'A leitura mostra recuperação depois de um período mais baixo. O que voltou a funcionar merece ser repetido.', 'Mantenha o hábito que você retomou, na mesma dose.'),
  item('recup-02', 'recuperacao', visualPeriods, 86, { kind: 'recovery' }, 'Houve uma queda e os números atuais subiram. Isso é retomada, não obrigação de acelerar.', 'Não aumente a meta enquanto o retorno ainda é recente.'),
  item('recup-03', 'recuperacao', ['semana'], 86, { kind: 'recovery' }, 'Em relação ao trecho equivalente da semana anterior, você recuperou terreno.', 'Repita nos próximos dias o que já voltou a ser cumprido.'),
  item('recup-04', 'recuperacao', ['mes'], 86, { kind: 'recovery' }, 'O mês atual está melhor que o mesmo trecho do mês anterior. A recuperação já aparece nos três pilares.', 'Sustente o ritmo desta semana antes de criar outro hábito.'),
  item('recup-05', 'recuperacao', ['ano'], 86, { kind: 'recovery' }, 'O ano está acima do mesmo ponto do ano anterior. A queda ficou para trás nos registros.', 'Proteja o hábito que explica essa volta.'),
  item('recup-06', 'recuperacao', visualPeriods, 86, { kind: 'recovery' }, 'Você saiu de uma base mais fraca e a média subiu. Pequenas retomadas contam quando se repetem.', 'Escolha um pilar e não falte a ele nos próximos dois dias.'),
  item('recup-07', 'recuperacao', visualPeriods, 86, { kind: 'recovery' }, 'A consistência voltou a aparecer depois de um intervalo mais baixo. O cuidado agora é não largar de novo.', 'Deixe o próximo hábito marcado no mesmo horário.'),
  item('recup-08', 'recuperacao', visualPeriods, 86, { kind: 'recovery' }, 'Há melhora real frente ao período comparado. Trate isso como recomeço estável, não como sprint.', 'Conserve o tamanho da ação que você conseguiu cumprir.'),

  item('melhora-01', 'melhora-progressiva', visualPeriods, 68, { kind: 'progress' }, 'Seu equilíbrio está melhor que no período equivalente anterior. A direção é boa.', 'Continue com ações pequenas o bastante para repetir.'),
  item('melhora-02', 'melhora-progressiva', visualPeriods, 68, { kind: 'progress' }, 'A média dos três pilares subiu na comparação justa. O progresso está nos registros, não na pressa.', 'Não troque um hábito que já está subindo.'),
  item('melhora-03', 'melhora-progressiva', ['semana'], 68, { kind: 'progress' }, 'Nos mesmos dias da semana anterior, você está melhor agora.', 'Mantenha o que mudou e deixe o resto quieto.'),
  item('melhora-04', 'melhora-progressiva', ['mes'], 68, { kind: 'progress' }, 'O mês está à frente do mesmo trecho do mês passado. A melhora é gradual.', 'Leve esse ritmo até o fim do mês, sem pico.'),
  item('melhora-05', 'melhora-progressiva', ['ano'], 68, { kind: 'progress' }, 'O ano supera o mesmo ponto do ano anterior. A mudança aparece no acumulado.', 'Anote o hábito que mais se repetiu e não o abandone.'),
  item('melhora-06', 'melhora-progressiva', visualPeriods, 68, { kind: 'progress' }, 'Há melhora progressiva. Mais importante que abrir outra frente é segurar esta.', 'Repita amanhã a ação que explica a subida.'),
  item('melhora-07', 'melhora-progressiva', visualPeriods, 68, { kind: 'progress' }, 'Os números subiram em relação ao período comparado. Constância explica isso melhor do que intensidade.', 'Mantenha a frequência atual por mais alguns dias.'),
  item('melhora-08', 'melhora-progressiva', visualPeriods, 68, { kind: 'progress' }, 'Você evoluiu na comparação equivalente. O próximo passo é não interromper o que já subiu.', 'Escolha o pilar que mais cresceu e preserve o hábito dele.'),

  item('marco-01', 'conquistas', visualPeriods, 72, { kind: 'milestone' }, 'Você sustentou um nível alto nos pilares. O marco agora é repetir, não aumentar a carga.', 'Mantenha o piso desta leitura por mais um ciclo.'),
  item('marco-02', 'conquistas', visualPeriods, 72, { kind: 'milestone' }, 'Os registros chegaram a um patamar forte. Isso é conquista acumulada, não um dia feliz.', 'Não comemore trocando a rotina que produziu o resultado.'),
  item('marco-03', 'conquistas', ['semana'], 72, { kind: 'milestone' }, 'A semana atingiu um marco alto. O que importa é conseguir a mesma medida na seguinte.', 'Anote os três hábitos que você de fato cumpriu.'),
  item('marco-04', 'conquistas', ['mes'], 72, { kind: 'milestone' }, 'O mês mostra um nível alto de equilíbrio. Pouca gente sustenta isso sem uma rotina simples.', 'Leve os mesmos hábitos para a primeira semana do próximo mês.'),
  item('marco-05', 'conquistas', ['ano'], 72, { kind: 'milestone' }, 'O ano acumulou um patamar alto. A mudança de comportamento já está no histórico.', 'Escolha o que não pode sair da sua vida no próximo ano.'),
  item('marco-06', 'conquistas', visualPeriods, 72, { kind: 'milestone' }, 'Há um marco pessoal nesta leitura: os pilares estão fortes ao mesmo tempo.', 'Proteja o hábito mais fácil de abandonar quando a vida apertar.'),
  item('marco-07', 'conquistas', visualPeriods, 72, { kind: 'milestone' }, 'Você chegou alto sem precisar de um número inventado. Os dados sustentam a conquista.', 'Reduza a novidade e preserve o que já está alto.'),
  item('marco-08', 'conquistas', visualPeriods, 72, { kind: 'milestone' }, 'O equilíbrio geral está em zona alta. O risco deixa de ser começar e passa a ser manter.', 'Defina o mínimo que você não negocia em cada pilar.'),

  item('dois-01', 'melhora-progressiva', visualPeriods, 84, { kind: 'two-up', behind: 'corpo' }, 'Você evoluiu em dois pilares. O Corpo ficou para trás nessa comparação.', 'Retome um hábito de corpo nos próximos dias.'),
  item('dois-02', 'melhora-progressiva', visualPeriods, 84, { kind: 'two-up', behind: 'mente' }, 'Você evoluiu em dois pilares. A Mente não acompanhou o mesmo passo.', 'Reserve um momento para o hábito de mente que já existe.'),
  item('dois-03', 'melhora-progressiva', visualPeriods, 84, { kind: 'two-up', behind: 'espirito' }, 'Você evoluiu em dois pilares. O Espírito ficou para trás na comparação.', 'Inclua uma prática curta de reflexão ou gratidão.'),
  item('dois-04', 'melhora-progressiva', ['semana'], 84, { kind: 'two-up', behind: 'corpo' }, 'Nesta semana dois pilares subiram e o Corpo não. O próximo passo é esse.', 'Faça a menor versão do cuidado físico já cadastrado.'),
  item('dois-05', 'melhora-progressiva', ['mes'], 84, { kind: 'two-up', behind: 'mente' }, 'No mês, dois pilares melhoraram e a Mente ficou. O ajuste cabe em um bloco curto.', 'Volte à leitura, ao estudo ou às prioridades.'),
  item('dois-06', 'melhora-progressiva', ['ano'], 84, { kind: 'two-up', behind: 'espirito' }, 'No ano, dois pilares cresceram e o Espírito não. A prioridade longa é essa.', 'Ligue uma prática de espírito a um horário que já existe.'),
  item('dois-07', 'melhora-progressiva', visualPeriods, 84, { kind: 'two-up', behind: 'mente' }, 'Dois eixos andaram. A Mente é o que ficou para trás — é ali que a próxima ação rende mais.', 'Não abra um curso novo: retome o hábito mental atual.'),
  item('dois-08', 'melhora-progressiva', visualPeriods, 84, { kind: 'two-up', behind: 'corpo' }, 'Há avanço em dois pilares e atraso no Corpo. Evoluir o resto sem o corpo deixa o mapa incompleto.', 'Reabra movimento, refeição ou higiene, o que já for seu.'),

  item('dia-01', 'orientacao-diaria', ['dia'], 70, { kind: 'reflection', period: 'dia' }, 'O dia já tem registros. Use o que falta hoje, não o que você gostaria de ter feito ontem.', 'Feche o hábito ainda em aberto antes de adicionar outro.'),
  item('dia-02', 'orientacao-diaria', ['dia'], 70, { kind: 'reflection', period: 'dia' }, 'A leitura de hoje mostra onde o dia está incompleto. Um pilar basta para ajustar agora.', 'Conclua o hábito mais simples que ainda está pendente.'),
  item('dia-03', 'orientacao-diaria', ['dia'], 70, { kind: 'reflection', period: 'dia' }, 'Hoje não precisa ser um dia perfeito. Precisa deixar um registro verdadeiro em cada pilar que existir.', 'Escolha uma pendência e termine só ela.'),
  item('dia-04', 'orientacao-diaria', ['dia'], 70, { kind: 'attention', pillar: 'corpo' }, 'Hoje o Corpo está atrás. Ainda dá para cumprir um cuidado antes do dia fechar.', 'Retome o hábito de corpo que segue pendente.'),
  item('dia-05', 'orientacao-diaria', ['dia'], 70, { kind: 'attention', pillar: 'mente' }, 'Hoje a Mente está atrás dos outros pilares. Um bloco curto ainda cabe no dia.', 'Abra o hábito de leitura, estudo ou prioridades.'),
  item('dia-06', 'orientacao-diaria', ['dia'], 70, { kind: 'attention', pillar: 'espirito' }, 'Hoje o Espírito está mais baixo. Um minuto de presença ainda altera o dia.', 'Dedique alguns minutos à reflexão antes de encerrar.'),
  item('dia-07', 'orientacao-diaria', ['dia'], 66, { kind: 'balanced' }, 'Os três pilares de hoje estão próximos. O dia pede continuidade, não uma nova lista.', 'Repita à noite só o que ainda não foi marcado.'),
  item('dia-08', 'orientacao-diaria', ['dia'], 90, { kind: 'start' }, 'O dia está no começo. Os primeiros hábitos concluídos é que desenham a leitura.', 'Comece pelo hábito mais curto de cada pilar.'),

  item('semana-01', 'reflexao-semanal', ['semana'], 40, { kind: 'reflection', period: 'semana' }, 'A semana já permite uma leitura. Olhe o pilar mais baixo antes de comemorar o mais alto.', 'Escolha uma ação para os dias que ainda faltam.'),
  item('semana-02', 'reflexao-semanal', ['semana'], 40, { kind: 'reflection', period: 'semana' }, 'No trecho já registrado da semana, o mapa mostra onde a rotina segurou e onde soltou.', 'Não reorganize tudo: ajuste um pilar só.'),
  item('semana-03', 'reflexao-semanal', ['semana'], 40, { kind: 'reflection', period: 'semana' }, 'A comparação usa os mesmos dias da semana anterior, para não misturar uma semana inteira com um pedaço.', 'Repita o que subiu e reabra o que caiu.'),
  item('semana-04', 'reflexao-semanal', ['semana'], 40, { kind: 'reflection', period: 'semana' }, 'Pequenas conclusões desta semana pesam mais do que uma intenção para a próxima.', 'Deixe combinado o hábito de amanhã antes de dormir.'),
  item('semana-05', 'reflexao-semanal', ['semana'], 40, { kind: 'reflection', period: 'semana' }, 'A semana não precisa fechar perfeita. Precisa terminar com um pilar menos esquecido.', 'Dê ao pilar mais baixo a próxima ação da sua lista.'),
  item('semana-06', 'reflexao-semanal', ['semana'], 40, { kind: 'reflection', period: 'semana' }, 'Seu ritmo semanal aparece na média dos três. Um pilar isolado não conta a história inteira.', 'Equilibre a próxima ação com o pilar que está atrás.'),
  item('semana-07', 'reflexao-semanal', ['semana'], 40, { kind: 'reflection', period: 'semana', closed: true }, 'A semana fechou. O que se repetiu até aqui é o que vale levar para a seguinte.', 'Escolha um hábito para não negociar na próxima semana.'),
  item('semana-08', 'reflexao-semanal', ['semana'], 40, { kind: 'reflection', period: 'semana', closed: true }, 'Com a semana completa, a leitura deixa de ser parcial. Use isso para um ajuste só.', 'Mude uma coisa na semana que começa, não três.'),

  item('mes-01', 'analise-mensal', ['mes'], 40, { kind: 'reflection', period: 'mes' }, 'O mês, no trecho já vivido, mostra tendência — não um veredito. Oscilar faz parte.', 'Escolha uma melhoria que caiba até o fim do mês.'),
  item('mes-02', 'analise-mensal', ['mes'], 40, { kind: 'reflection', period: 'mes' }, 'A comparação mensal usa o mesmo intervalo de dias do mês anterior.', 'Não cobre de si a parte do mês que ainda não chegou.'),
  item('mes-03', 'analise-mensal', ['mes'], 40, { kind: 'reflection', period: 'mes' }, 'Há uma tendência no mês: algum pilar segura a média e outro a puxa para baixo.', 'Reforce só o pilar mais baixo nas próximas semanas.'),
  item('mes-04', 'analise-mensal', ['mes'], 40, { kind: 'reflection', period: 'mes' }, 'Constância mensal nasce de semanas comuns, não de um esforço concentrado no fim.', 'Mantenha a frequência atual em vez de compensar.'),
  item('mes-05', 'analise-mensal', ['mes'], 40, { kind: 'reflection', period: 'mes' }, 'O mês pede uma melhoria sustentável. Trocar todos os hábitos de uma vez apaga o que já funciona.', 'Altere um hábito e conserve os outros.'),
  item('mes-06', 'analise-mensal', ['mes'], 40, { kind: 'reflection', period: 'mes' }, 'Se houve oscilação, ela está nos registros. A resposta é encurtar a ação, não abandonar o pilar.', 'Volte à versão menor do hábito que falhou mais.'),
  item('mes-07', 'analise-mensal', ['mes'], 40, { kind: 'reflection', period: 'mes', closed: true }, 'O mês fechou. A média dos três é o retrato do que se repetiu, não do que foi planejado.', 'Leve para o próximo mês apenas o hábito que sobreviveu.'),
  item('mes-08', 'analise-mensal', ['mes'], 40, { kind: 'reflection', period: 'mes', closed: true }, 'Com o mês completo, dá para ver o desequilíbrio sem a desculpa dos dias que faltavam.', 'Defina uma prioridade única para o mês que entra.'),

  item('ano-01', 'reflexao-anual', ['ano'], 40, { kind: 'reflection', period: 'ano' }, 'O ano, até esta data, mostra o que virou comportamento. Um mês bom não segura o acumulado sozinho.', 'Escolha a prioridade que ainda falta no restante do ano.'),
  item('ano-02', 'reflexao-anual', ['ano'], 40, { kind: 'reflection', period: 'ano' }, 'A comparação anual usa o mesmo ponto do ano anterior, não os doze meses contra um pedaço.', 'Olhe o pilar que ficou sistematicamente atrás.'),
  item('ano-03', 'reflexao-anual', ['ano'], 40, { kind: 'reflection', period: 'ano' }, 'Há uma história no ano: o pilar que se repetiu é o que realmente mudou.', 'Não abandone esse hábito no próximo trimestre.'),
  item('ano-04', 'reflexao-anual', ['ano'], 40, { kind: 'reflection', period: 'ano' }, 'O longo prazo premia o hábito chato que ficou. Intensidade eventual some da média.', 'Reduza a lista anual ao que você já consegue repetir.'),
  item('ano-05', 'reflexao-anual', ['ano'], 40, { kind: 'reflection', period: 'ano' }, 'Se um pilar está baixo no ano inteiro, essa é a prioridade de longo prazo.', 'Ligue esse pilar a um horário que já existe na sua semana.'),
  item('ano-06', 'reflexao-anual', ['ano'], 40, { kind: 'reflection', period: 'ano' }, 'O acumulado do ano é mais honesto que a última semana. Use os dois, sem confundir os dois.', 'Mantenha o hábito anual e ajuste só o buraco recente.'),
  item('ano-07', 'reflexao-anual', ['ano'], 40, { kind: 'reflection', period: 'ano', closed: true }, 'O ano fechou. O que ficou nos três pilares é a mudança que você consegue defender.', 'Escolha o que continua no primeiro mês do ano novo.'),
  item('ano-08', 'reflexao-anual', ['ano'], 40, { kind: 'reflection', period: 'ano', closed: true }, 'Com o ano completo, a prioridade deixa de ser intensidade e passa a ser o que merece continuar.', 'Leve um hábito de cada pilar para o próximo ciclo.'),
];
