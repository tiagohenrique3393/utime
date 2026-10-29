import { shiftDateKey, weekdayIndex } from '@/lib/progress-view';

export const weeklyPhrases = [
  'Pequenas ações diárias constroem grandes resultados.',
  'Disciplina é cumprir o combinado quando ninguém aplaude.',
  'Constância vale mais do que um dia perfeito.',
  'O hábito de hoje prepara o corpo de amanhã.',
  'A mente se fortalece na repetição silenciosa.',
  'Espírito firme começa no minuto que você não foge.',
  'Foco é escolher uma coisa e terminá-la.',
  'Responsabilidade é olhar o dia e não negociar com ele.',
  'Evolução cabe em um hábito feito por inteiro.',
  'Resiliência é voltar ao plano sem dramatizar a queda.',
  'O corpo responde ao que você repete, não ao que você promete.',
  'Uma rotina curta e honesta vence a pressa.',
  'Quem cuida da mente decide melhor o resto do dia.',
  'O espírito se acalma quando a ação chega antes da desculpa.',
  'Não espere motivação para cumprir o que já está marcado.',
  'A meta do dia é um piso, não um teto para se acomodar.',
  'Excelência é o dia fechado, não o discurso sobre ele.',
  'Volte ao próximo hábito. O dia ainda está aberto.',
  'Água, movimento e sono sustentam o resto da disciplina.',
  'Leitura curta ainda é treino da mente.',
  'Um minuto de presença vale mais do que uma hora dispersa.',
  'A sequência cresce quando o dia ruim também é registrado.',
  'Não negocie com o hábito mais fácil só para marcar ponto.',
  'Corpo, mente e espírito pedem o mesmo respeito.',
  'O plano de hoje é pequeno de propósito.',
  'Cansado ainda pode cumprir o essencial.',
  'Atraso não apaga o que ainda dá para fazer.',
  'Feche um hábito antes de abrir outra distração.',
  'A barra sobe com o que foi feito, não com a intenção.',
  'Setenta por cento já é um dia que se sustenta.',
  'Cem por cento é raro e por isso merece ser visto.',
  'Não compare seu dia com o cartaz de outra pessoa.',
  'A rotina da manhã define o tom, não a sorte.',
  'A tarde ainda cabe um hábito que a manhã deixou.',
  'A noite serve para encerrar, não para se cobrar em silêncio.',
  'Repetir o simples é o caminho mais sério.',
  'Disciplina sem vaidade continua sendo disciplina.',
  'Constância é aparecer de novo na segunda.',
  'Resiliência não é nunca falhar. É não sumir.',
  'Hábitos são votos pagos no mesmo horário.',
  'O foco cabe em uma tarefa visível.',
  'Responsabilidade começa quando você marca o que fez.',
  'Evolução pessoal é discreta e acumulada.',
  'Cuide do corpo como quem pretende continuar.',
  'Treine a mente com uma página, não com um discurso.',
  'Alimente o espírito com silêncio e palavra cumprida.',
  'O próximo hábito é mais útil do que o hábito ideal.',
  'Não aumente a lista para fugir da que já existe.',
  'Um dia comum bem feito muda o mês.',
  'A pressa estraga o hábito que pedia presença.',
  'Se o dia quebrou, recomece pelo menor compromisso.',
  'A meta não se discute no meio do cansaço.',
  'Excelência não grita. Ela termina a lista.',
  'Hidrate o corpo antes de exigir rendimento dele.',
  'Movimento curto ainda conta como cuidado.',
  'Estudo sem regularidade vira só vontade.',
  'Oração, leitura ou silêncio: escolha e faça.',
  'O ranking não substitui o hábito de hoje.',
  'Pontuação nenhuma corrige um dia inventado.',
  'Seja fiel ao horário que você mesmo definiu.',
  'A disciplina fica leve quando deixa de ser debate.',
  'Constância protege você dos dias sem vontade.',
  'Resiliência é retomar sem reescrever a regra.',
  'Hábitos sobrevivem melhor em silêncio do que em anúncio.',
  'Foco é recusar o que não está na lista de hoje.',
  'Responsabilidade é admitir o que ficou pendente.',
  'Evolução se mede na semana, não no impulso.',
  'O corpo agradece o que foi feito cedo.',
  'A mente agradece o que foi terminado.',
  'O espírito agradece o que foi feito sem plateia.',
  'Não terceirize o seu dia para o humor.',
  'Um hábito concluído devolve clareza.',
  'O gráfico só sobe depois da ação.',
  'Deixe o dia menos negociável e mais simples.',
  'A barra vazia de manhã não é sentença.',
  'A barra cheia à noite é consequência.',
  'Cumprir setenta por cento ainda é um dia de respeito.',
  'Chegar a cem por cento é fechar a conta consigo.',
  'Não esconda o dia fraco. Ele ensina o próximo.',
  'A rotina não precisa ser bonita. Precisa ser verdadeira.',
  'Disciplina é a forma adulta da esperança.',
  'Constância transforma esforço em caráter.',
  'Resiliência cabe em recomeçar sem plateia.',
  'Hábitos são a memória que o corpo guarda.',
  'Foco é uma porta fechada na hora certa.',
  'Responsabilidade não pede permissão ao cansaço.',
  'Evolução pessoal é uma soma de dias comuns.',
  'Corpo disciplinado sustenta a ambição.',
  'Mente disciplinada escolhe o essencial.',
  'Espírito disciplinado não abandona o combinado.',
  'Hoje pede uma ação, não uma nova teoria.',
  'O essencial cabe antes do extra.',
  'Termine o que está na sua frente.',
  'Amanhã herda o que você não empurrou.',
  'A semana muda quando a segunda é cumprida.',
  'Não espere o dia perfeito para ser fiel ao plano.',
  'Pequeno e repetido vence grande e raro.',
  'O seu nome no dia é o hábito que você conclui.',
  'Silêncio, água e movimento já organizam a manhã.',
  'A noite boa começa no hábito que não ficou pela metade.',
  'Seja exigente com o plano e gentil com a retomada.',
  'O caminho longo é feito de dias que ninguém viu.',
  'Disciplina hoje. Constância no caminho.',
  'Você não precisa de mais motivação. Precisa do próximo passo.',
] as const;

const epochMonday = '2024-01-01';

export function weekMonday(dateKey: string) {
  const offset = (weekdayIndex(dateKey) + 6) % 7;
  return shiftDateKey(dateKey, -offset);
}

function utcDay(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function weeklyPhraseIndex(dateKey: string) {
  const days = Math.round((utcDay(weekMonday(dateKey)) - utcDay(epochMonday)) / 86400000);
  const weeks = Math.floor(days / 7);
  return ((weeks % weeklyPhrases.length) + weeklyPhrases.length) % weeklyPhrases.length;
}

export function weeklyPhrase(dateKey: string) {
  return weeklyPhrases[weeklyPhraseIndex(dateKey)];
}
