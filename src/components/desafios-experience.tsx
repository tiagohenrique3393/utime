import { Image } from 'expo-image';
import { createElement, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, type GestureResponderEvent } from 'react-native';

import { DayPlanet } from '@/components/day-planet';
import { AppScreen } from '@/components/app-screen';
import { fonts } from '@/constants/theme';
import type { ActiveChallenge, ChallengeHistoryItem, ChallengeSnapshot } from '@/lib/desafios-api';
import {
  COMMITMENT_LIMIT,
  PILLARS,
  buildObligations,
  canCheckIn,
  contractDayNumber,
  contractSpan,
  dayMarks,
  formatChallengeDate,
  obligationSummary,
  signatureIsValid,
  type ChallengeCommitment,
  type ChallengeDraft,
  type ChallengeDuration,
  type ChallengePillar,
  type SignatureStroke,
} from '@/lib/desafios';
import type { JourneyId } from '@/lib/profile';

const gold = '#E6D2AE';
const ink = '#161412';
const green = '#3DDC97';
const red = '#E07A72';
const card = 'rgba(12, 11, 10, 0.92)';
const line = 'rgba(230, 210, 174, 0.42)';

const banners = {
  metime: require('@/assets/desafios/banner-mantime.jpg'),
  womantime: require('@/assets/desafios/banner-womantime.jpg'),
};
const figures = {
  metime: require('@/assets/pillars/corpo-mantime.png'),
  womantime: require('@/assets/pillars/corpo-womantime.png'),
  mente: require('@/assets/pillars/mente.png'),
  espirito: require('@/assets/pillars/espirito.png'),
};

const pillarName: Record<ChallengePillar, string> = { corpo: 'Corpo', mente: 'Mente', espirito: 'Espírito' };
const examples: Record<ChallengePillar, string> = {
  corpo: 'Ex.: Treinar 5x por semana.',
  mente: 'Ex.: Ler 15 minutos por dia.',
  espirito: 'Ex.: Meditar 10 minutos por dia.',
};
const weekNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const weekMarks = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export type DesafiosScreenView = 'home' | 'edit' | 'contract' | 'track' | 'history' | 'document';

function svg(size: number, ...children: ReactNode[]) {
  return createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true }, ...children);
}

function stroke(color = gold) {
  return { fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
}

function Mark({ name, size = 18, color = gold }: { name: string; size?: number; color?: string }) {
  if (Platform.OS !== 'web') {
    return <View style={{ width: size, height: size }} />;
  }
  const pen = stroke(color);
  if (name === 'target') {
    return svg(size, createElement('circle', { cx: 12, cy: 12, r: 7, ...pen }), createElement('circle', { cx: 12, cy: 12, r: 2, fill: color, stroke: 'none' }), createElement('path', { d: 'M12 2.5V6M12 18v3.5M2.5 12H6M18 12h3.5', ...pen }));
  }
  if (name === 'crown') {
    return svg(size, createElement('path', { d: 'M4 16.5 6 8l4 3.5L12 6l2 5.5L18 8l2 8.5', ...pen }), createElement('path', { d: 'M5 19h14', ...pen }));
  }
  if (name === 'back') {
    return svg(size, createElement('path', { d: 'M14.5 5.5 8 12l6.5 6.5', ...pen }));
  }
  if (name === 'layers') {
    return svg(size, createElement('path', { d: 'M4 8.5h16v9H4z', ...pen }), createElement('path', { d: 'M7 8.5V6h10v2.5', ...pen }));
  }
  if (name === 'calendar') {
    return svg(size, createElement('rect', { x: 4, y: 5.5, width: 16, height: 13, rx: 2, ...pen }), createElement('path', { d: 'M4 9.5h16M8 4.5v3M16 4.5v3', ...pen }));
  }
  if (name === 'flag') {
    return svg(size, createElement('path', { d: 'M6 20V4.5M6 5h10l-2 3.2 2 3.3H6', ...pen }));
  }
  if (name === 'play') {
    return svg(size, createElement('path', { d: 'M8 5.5v13l11-6.5L8 5.5Z', ...pen }));
  }
  if (name === 'pencil') {
    return svg(size, createElement('path', { d: 'M13.2 5.4 18.6 10.8 8.2 21.2H2.8v-5.4L13.2 5.4Z', ...pen }), createElement('path', { d: 'M11.4 7.2 16.8 12.6', ...pen }));
  }
  if (name === 'trophy') {
    return svg(size, createElement('path', { d: 'M8 4h8v5a4 4 0 0 1-8 0V4Z', ...pen }), createElement('path', { d: 'M8 6H5.5A2.5 2.5 0 0 0 8 9.5M16 6h2.5A2.5 2.5 0 0 1 16 9.5M12 13v3M9 20h6', ...pen }));
  }
  if (name === 'torn') {
    return svg(size, createElement('path', { d: 'M7 3.5h8l2 2.2V20l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V3.5Z', ...pen }), createElement('path', { d: 'M9 9h6M9 12.5h6', ...pen }));
  }
  return svg(size, createElement('path', { d: 'M5 12.5 9.2 17 19 7', ...stroke(color) }));
}

function figureFor(pillar: ChallengePillar, journey: JourneyId | null) {
  if (pillar === 'mente') {
    return figures.mente;
  }
  if (pillar === 'espirito') {
    return figures.espirito;
  }
  if (journey === 'womantime') {
    return figures.womantime;
  }
  if (journey === 'metime') {
    return figures.metime;
  }
  return null;
}

function Banner({ journey }: { journey: JourneyId | null }) {
  if (!journey) {
    return <View style={styles.banner} />;
  }
  return (
    <View style={styles.banner}>
      <Image source={banners[journey]} contentFit="cover" style={styles.bannerImage} accessibilityLabel={journey === 'womantime' ? 'Woman Time' : 'Man Time'} />
      <View style={styles.bannerVeil} />
    </View>
  );
}

function GoldButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.goldButton, (pressed || disabled) && styles.pressed]}>
      <Text style={styles.goldLabel}>{label}</Text>
    </Pressable>
  );
}

function DurationRow({ value, onChange, disabled = false }: { value: ChallengeDuration | null; onChange?: (value: ChallengeDuration) => void; disabled?: boolean }) {
  return (
    <View style={styles.durationRow}>
      {([7, 14, 21, 30] as const).map((item) => {
        const selected = value === item;
        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange?.(item)}
            style={[styles.duration, selected && styles.durationOn]}>
            <Text style={[styles.durationLabel, selected && styles.durationLabelOn]}>{item} dias</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Header({ journey, onBack }: { journey: JourneyId | null; onBack: () => void }) {
  const modality = journey === 'womantime' ? 'WOMAN TIME' : journey === 'metime' ? 'MAN TIME' : 'JORNADA';
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} style={styles.back}>
        <Mark name="back" size={18} />
      </Pressable>
      <Text style={styles.modality}>{modality}</Text>
      <View style={styles.premium}><Text style={styles.premiumText}>PREMIUM</Text></View>
      <View style={styles.headerSpace} />
      <Mark name="crown" size={18} />
    </View>
  );
}

function TitleBlock() {
  return (
    <View style={styles.titleRow}>
      <Mark name="target" size={28} />
      <Text accessibilityRole="header" style={styles.title}>DESAFIOS</Text>
    </View>
  );
}

function SignaturePad({ strokes, onChange }: { strokes: SignatureStroke[]; onChange: (strokes: SignatureStroke[]) => void }) {
  const size = useRef({ width: 1, height: 1 });
  const drawing = useRef<SignatureStroke>([]);
  function point(event: GestureResponderEvent) {
    const width = Math.max(size.current.width, 1);
    const height = Math.max(size.current.height, 1);
    return {
      x: Math.round(Math.max(0, Math.min(1, event.nativeEvent.locationX / width)) * 1000) / 1000,
      y: Math.round(Math.max(0, Math.min(1, event.nativeEvent.locationY / height)) * 1000) / 1000,
    };
  }
  const lines = strokes.map((stroke, index) => stroke.map((item) => `${item.x * 100},${item.y * 100}`).join(' ') && (
    createElement('polyline', {
      key: index,
      points: stroke.map((item) => `${item.x * 300} ${item.y * 120}`).join(' '),
      fill: 'none',
      stroke: gold,
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    })
  ));
  return (
    <View
      accessibilityLabel="Área de assinatura"
      style={styles.pad}
      onLayout={(event) => {
        size.current = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height };
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        drawing.current = [point(event)];
        onChange([...strokes, drawing.current]);
      }}
      onResponderMove={(event) => {
        drawing.current = [...drawing.current, point(event)];
        onChange([...strokes.slice(0, -1), drawing.current]);
      }}>
      {Platform.OS === 'web'
        ? createElement('svg', { width: '100%', height: '100%', viewBox: '0 0 300 120', preserveAspectRatio: 'none' }, lines)
        : <Text style={styles.padNote}>{strokes.length > 0 ? 'Assinatura registrada' : 'Desenhe aqui'}</Text>}
    </View>
  );
}

export function DesafiosExperience({
  snapshot,
  journey,
  view,
  document,
  noticeVisible,
  message,
  pending,
  onBack,
  onView,
  onDraft,
  onSign,
  onCheckIn,
  onAcknowledge,
  onHideNotice,
  onReplace,
  onOpenDocument,
}: {
  snapshot: ChallengeSnapshot;
  journey: JourneyId | null;
  view: DesafiosScreenView;
  document: ActiveChallenge | null;
  noticeVisible: boolean;
  message: string;
  pending: boolean;
  onBack: () => void;
  onView: (view: DesafiosScreenView) => void;
  onDraft: (draft: ChallengeDraft) => void;
  onSign: (input: { mode: 'touch' | 'typed'; name: string; strokes: SignatureStroke[] }) => void;
  onCheckIn: (pillar: ChallengePillar) => void;
  onAcknowledge: () => void;
  onHideNotice: () => void;
  onReplace: () => void;
  onOpenDocument: (id: string) => void;
}) {
  const draft = snapshot.draft;
  const active = snapshot.active;
  const source = active && view !== 'edit' && view !== 'contract' ? active.commitments : draft.commitments;
  const duration = active && (view === 'home' || view === 'track') ? active.durationDays : draft.durationDays;
  const [editor, setEditor] = useState<ChallengePillar | null>(null);
  const [draftText, setDraftText] = useState('');
  const [mode, setMode] = useState<'touch' | 'typed'>('touch');
  const [name, setName] = useState(snapshot.firstName);
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [detail, setDetail] = useState<ChallengePillar | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const today = snapshot.today;
  const preview = draft.durationDays && today ? buildObligations(draft.commitments, today, draft.durationDays) : null;
  const previewEnd = draft.durationDays && today ? contractSpan(today, draft.durationDays).endsOn : '';

  function updateCommitment(pillar: ChallengePillar, patch: Partial<ChallengeCommitment>) {
    onDraft({
      ...draft,
      commitments: draft.commitments.map((item) => (item.pillar === pillar ? { ...item, ...patch, pillar } : item)),
    });
  }

  const body = (() => {
    if (snapshot.plan === 'free') {
      return <Text style={styles.note}>Desafios é uma função Premium. A aba permanece visível, mas o contrato e os registros ficam bloqueados.</Text>;
    }
    if (snapshot.plan === 'unavailable') {
      return <Text style={styles.note}>{snapshot.message || 'Desafios ainda não está disponível nesta conta.'}</Text>;
    }
    if (view === 'edit') {
      return (
        <>
          <Text accessibilityRole="header" style={styles.screenTitle}>EDITAR DESAFIOS</Text>
          <Text style={styles.lead}>Defina seus 3 desafios{'\n'}(um para cada pilar).</Text>
          {PILLARS.map((pillar) => {
            const item = draft.commitments.find((entry) => entry.pillar === pillar) ?? { pillar, text: '', frequency: { kind: 'daily' as const } };
            return (
              <View key={pillar} style={styles.editCard}>
                <Figure pillar={pillar} journey={journey} />
                <View style={styles.editCopy}>
                  <Text style={styles.editTitle}>{`${pillarName[pillar].toUpperCase()} (obrigatório)`}</Text>
                  <Text numberOfLines={2} style={styles.example}>{item.text || examples[pillar]}</Text>
                  <FrequencyEditor commitment={item} onChange={(frequency) => updateCommitment(pillar, { frequency })} />
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${pillarName[pillar]}`} onPress={() => { setEditor(pillar); setDraftText(item.text); }} style={styles.pencil}>
                  <Mark name="pencil" size={16} />
                  <Text style={styles.pencilLabel}>Editar</Text>
                </Pressable>
              </View>
            );
          })}
          <View style={styles.sectionRow}><Mark name="calendar" size={16} /><Text style={styles.section}>DURAÇÃO DO DESAFIO</Text></View>
          <DurationRow value={draft.durationDays} onChange={(value) => onDraft({ ...draft, durationDays: value })} />
          <GoldButton label="ASSINAR CONTRATO" disabled={pending} onPress={() => onView('contract')} />
        </>
      );
    }
    if (view === 'contract' || view === 'document') {
      const reading = view === 'document' ? document : null;
      const commitments = reading ? reading.commitments : draft.commitments;
      const spanDays = reading ? reading.durationDays : draft.durationDays;
      const starts = reading ? reading.startsOn : today;
      const ends = reading ? reading.endsOn : previewEnd;
      const plan = reading ? { ok: true as const, obligations: reading.obligations } : preview;
      const signedName = reading?.signatureMode === 'typed' ? reading.signatureText : name;
      return (
        <>
          <Text accessibilityRole="header" style={styles.screenTitle}>CONTRATO COMIGO MESMO</Text>
          <Text style={styles.lead}>Contrato de Desafio Pessoal</Text>
          <View style={styles.paper}>
            <Text style={styles.clause}>
              {`Pelo presente, eu, ${snapshot.firstName || signedName || 'usuário'}, firmo comigo mesmo o compromisso de realizar um desafio pessoal, baseado nos três pilares: Corpo, Mente e Espírito, pelo período de ${spanDays ?? '—'} dias, conforme as cláusulas abaixo:`}
            </Text>
            <Text style={styles.clauseTitle}>CLÁUSULA 1 - DO OBJETIVO</Text>
            <Text style={styles.clause}>O usuário assume o compromisso de cumprir as metas pessoais definidas nos pilares Corpo, Mente e Espírito.</Text>
            {commitments.map((item) => <Text key={item.pillar} style={styles.clause}>{`${pillarName[item.pillar]}: ${item.text || '—'}`}</Text>)}
            <Text style={styles.clauseTitle}>CLÁUSULA 2 - DO PRAZO</Text>
            <Text style={styles.clause}>{`O desafio terá duração de ${spanDays ?? '—'} dias consecutivos, com início em ${starts ? formatChallengeDate(starts) : '—'} e término em ${ends ? formatChallengeDate(ends) : '—'}. O primeiro dia é a data da assinatura. O último dia se encerra à meia-noite seguinte, no horário de Brasília.`}</Text>
            <Text style={styles.clauseTitle}>CLÁUSULA 3 - DA CONSTÂNCIA</Text>
            <Text style={styles.clause}>O usuário compromete-se a cumprir os compromissos nas datas e condições estabelecidas.</Text>
            {PILLARS.map((pillar) => <Text key={pillar} style={styles.clause}>{`${pillarName[pillar]}. ${plan && plan.ok ? obligationSummary(pillar, plan.obligations) : 'Defina a frequência antes de assinar.'}`}</Text>)}
            <Text style={styles.clauseTitle}>CLÁUSULA 4 - DO DESCUMPRIMENTO</Text>
            <Text style={styles.clause}>O não cumprimento de qualquer obrigação exigível provocará a rescisão automática do contrato após o encerramento do respectivo prazo.</Text>
            <Text style={styles.clauseTitle}>CLÁUSULA 5 - DA CONCORDÂNCIA</Text>
            <Text style={styles.clause}>O usuário declara que leu, compreendeu e aceitou integralmente as condições do desafio. Este registro é um compromisso pessoal no aplicativo e não é uma assinatura digital certificada.</Text>
            {reading ? (
              <Text style={styles.signatureText}>{reading.signatureMode === 'typed' ? reading.signatureText : 'Assinatura desenhada na tela'}</Text>
            ) : (
              <>
                <Text style={styles.section}>ASSINATURA</Text>
                <View style={styles.modeRow}>
                  <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'touch' }} onPress={() => setMode('touch')} style={[styles.mode, mode === 'touch' && styles.modeOn]}><Text style={[styles.modeLabel, mode === 'touch' && styles.modeLabelOn]}>Touchscreen</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'typed' }} onPress={() => setMode('typed')} style={[styles.mode, mode === 'typed' && styles.modeOn]}><Text style={[styles.modeLabel, mode === 'typed' && styles.modeLabelOn]}>Digitar nome</Text></Pressable>
                </View>
                {mode === 'touch' ? <SignaturePad strokes={strokes} onChange={setStrokes} /> : (
                  <>
                    <TextInput accessibilityLabel="Nome da assinatura" value={name} onChangeText={setName} placeholder="Nome completo" placeholderTextColor="#8C8882" style={styles.input} />
                    <Text style={styles.signatureText}>{name.trim() || ' '}</Text>
                  </>
                )}
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={() => setAccepted((value) => !value)} style={styles.accept}>
                  <View style={[styles.box, accepted && styles.boxOn]} />
                  <Text style={styles.acceptLabel}>Li e aceito o contrato.</Text>
                </Pressable>
              </>
            )}
          </View>
          {reading ? null : (
            <View style={styles.signRow}>
              <Pressable accessibilityRole="button" onPress={() => { setStrokes([]); setName(''); }} style={styles.clear}><Text style={styles.clearLabel}>Limpar</Text></Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={pending || !accepted || !signatureIsValid(mode, name, strokes) || !preview?.ok}
                onPress={() => onSign({ mode, name, strokes })}
                style={({ pressed }) => [styles.signButton, (pressed || pending || !accepted || !signatureIsValid(mode, name, strokes) || !preview?.ok) && styles.pressed]}>
                <Text style={styles.goldLabel}>{pending ? 'SALVANDO' : 'ASSINAR E SALVAR'}</Text>
              </Pressable>
            </View>
          )}
          {preview && !preview.ok ? <Text style={styles.warning}>{preview.message}</Text> : null}
        </>
      );
    }
    if (view === 'track' && active) {
      const day = contractDayNumber(active.startsOn, active.endsOn, today);
      return (
        <>
          <Banner journey={journey} />
          <Text style={styles.dayLabel}>{`Dia ${day} de ${active.durationDays}`}</Text>
          {active.commitments.map((item) => (
            <Pressable key={item.pillar} accessibilityRole="button" accessibilityLabel={`Abrir ${pillarName[item.pillar]}`} onPress={() => setDetail(item.pillar)} style={styles.trackCard}>
              <Figure pillar={item.pillar} journey={journey} />
              <View style={styles.trackCopy}>
                <Text style={styles.trackPillar}>{pillarName[item.pillar].toUpperCase()}</Text>
                <Text style={styles.trackText}>{item.text}</Text>
                <View style={styles.dots}>
                  {dayMarks(active.startsOn, active.durationDays, item.pillar, active.checkins).map((done, index) => <View key={`${item.pillar}-${index}`} style={[styles.dot, done && styles.dotOn]} />)}
                </View>
              </View>
            </Pressable>
          ))}
          <View style={styles.actionRow}>
            <Square icon="pencil" label={'EDITAR\nDESAFIOS'} onPress={() => setReplaceOpen(true)} />
            <Square icon="torn" label={'VER MEU\nCONTRATO'} onPress={() => onOpenDocument(active.id)} />
            <Square icon="trophy" label={'HISTÓRICO DE\nDESAFIOS'} onPress={() => onView('history')} />
          </View>
          <Text style={styles.warning}>Ao não cumprir qualquer compromisso exigível, seu contrato será rescindido automaticamente.</Text>
        </>
      );
    }
    if (view === 'history') {
      return (
        <>
          <Text accessibilityRole="header" style={styles.screenTitle}>HISTÓRICO DE DESAFIOS</Text>
          <View style={styles.countRow}>
            <View style={styles.countCard}><Mark name="trophy" /><Text style={styles.countLabel}>DESAFIOS{'\n'}CONQUISTADOS</Text><Text style={styles.countValue}>{snapshot.counts.concluded}</Text></View>
            <View style={[styles.countCard, styles.countDanger]}><Mark name="torn" color={red} /><Text style={styles.countLabel}>CONTRATOS{'\n'}RESCINDIDOS</Text><Text style={[styles.countValue, styles.countValueDanger]}>{snapshot.counts.rescinded}</Text></View>
          </View>
          <Text style={styles.section}>ÚLTIMOS DESAFIOS</Text>
          {snapshot.history.length === 0 ? <Text style={styles.note}>Nenhum contrato registrado.</Text> : snapshot.history.map((item) => <HistoryRow key={item.id} item={item} onPress={() => onOpenDocument(item.id)} />)}
        </>
      );
    }
    return (
      <>
        <Banner journey={journey} />
        <View style={styles.sectionRow}><Mark name="layers" size={16} /><Text style={styles.section}>SEUS DESAFIOS</Text></View>
        <View style={styles.homeRow}>
          {PILLARS.map((pillar) => {
            const text = source.find((item) => item.pillar === pillar)?.text ?? '';
            return (
              <View key={pillar} style={styles.homeCard}>
                <Figure pillar={pillar} journey={journey} />
                {text ? <Text style={styles.homeText}>{text}</Text> : null}
              </View>
            );
          })}
        </View>
        <View style={styles.sectionRow}><Mark name="calendar" size={16} /><Text style={styles.section}>DURAÇÃO DO DESAFIO</Text></View>
        <DurationRow value={duration} disabled={Boolean(active)} onChange={(value) => onDraft({ ...draft, durationDays: value })} />
        <View style={styles.rule}><Mark name="flag" size={16} /><Text style={styles.ruleText}>REGRA DO DESAFIO / Crie um desafio baseado nos três pilares.</Text></View>
        <Pressable accessibilityRole="button" onPress={() => onView(active ? 'track' : 'edit')} style={({ pressed }) => [styles.goldButton, styles.playButton, pressed && styles.pressed]}>
          <Mark name="play" size={16} color={ink} />
          <Text style={styles.goldLabel}>INICIAR / ACOMPANHAR DESAFIOS</Text>
        </Pressable>
      </>
    );
  })();

  const editing = draft.commitments.find((item) => item.pillar === editor);
  return (
    <AppScreen tight backgroundColor="#050505" backdrop={<DayPlanet />}>
      <Header journey={journey} onBack={onBack} />
      {view === 'home' || view === 'track' ? <TitleBlock /> : null}
      {body}
      {message ? <Text style={styles.note}>{message}</Text> : null}
      {editor && editing ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setEditor(null)}>
          <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.screenTitle}>{`EDITAR ${pillarName[editor].toUpperCase()}`}</Text>
            <TextInput accessibilityLabel={`Compromisso de ${pillarName[editor]}`} multiline value={draftText} onChangeText={(value) => setDraftText([...value].slice(0, COMMITMENT_LIMIT).join(''))} style={styles.editor} />
            <Text style={styles.counter}>{`${[...draftText].length}/${COMMITMENT_LIMIT}`}</Text>
            <GoldButton label="GUARDAR TEXTO" onPress={() => { updateCommitment(editor, { text: draftText.trim() }); setEditor(null); }} />
          </View>
          </View>
        </Modal>
      ) : null}
      {detail && active ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setDetail(null)}>
          <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.screenTitle}>{pillarName[detail].toUpperCase()}</Text>
            <Text style={styles.clause}>{obligationSummary(detail, active.obligations)}</Text>
            <GoldButton label="CUMPRI HOJE" disabled={pending || canCheckIn({ status: active.status, startsOn: active.startsOn, endsOn: active.endsOn, pillar: detail, obligations: active.obligations, checkins: active.checkins, today }) !== ''} onPress={() => onCheckIn(detail)} />
            <Pressable accessibilityRole="button" onPress={() => setDetail(null)} style={styles.clear}><Text style={styles.clearLabel}>Fechar</Text></Pressable>
          </View>
          </View>
        </Modal>
      ) : null}
      {replaceOpen ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setReplaceOpen(false)}>
          <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.screenTitle}>ENCERRAR CONTRATO</Text>
            <Text style={styles.clause}>O contrato ativo será encerrado. Ele não conta como conquista nem como rescisão por falha, e o histórico permanece. Os textos atuais viram rascunho e só passam a valer com uma nova assinatura.</Text>
            <GoldButton label={pending ? 'ENCERRANDO' : 'ENCERRAR E CRIAR OUTRO'} disabled={pending} onPress={() => { setReplaceOpen(false); onReplace(); }} />
            <Pressable accessibilityRole="button" onPress={() => setReplaceOpen(false)} style={styles.clear}><Text style={styles.clearLabel}>Voltar</Text></Pressable>
          </View>
          </View>
        </Modal>
      ) : null}
      {noticeVisible && snapshot.notice ? (
        <Modal transparent animationType="fade" visible>
          <View style={styles.overlay}>
          <View style={styles.rescinded}>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar aviso" onPress={onHideNotice} style={styles.noticeClose}><Text style={styles.clearLabel}>×</Text></Pressable>
            <Mark name="torn" size={28} color="#F4F1EA" />
            <Text style={styles.rescindedTitle}>SEU CONTRATO{'\n'}FOI RESCINDIDO.</Text>
            <Text style={styles.rescindedCopy}>Você não cumpriu com o que assinou.{'\n'}O desafio foi cancelado.</Text>
            <GoldButton label="ENTENDI" disabled={pending} onPress={onAcknowledge} />
          </View>
          </View>
        </Modal>
      ) : null}
    </AppScreen>
  );
}

function Figure({ pillar, journey }: { pillar: ChallengePillar; journey: JourneyId | null }) {
  const source = figureFor(pillar, journey);
  if (!source) {
    return <View style={styles.figure} />;
  }
  return <Image source={source} contentFit="contain" style={styles.figure} accessibilityLabel={pillarName[pillar]} />;
}

function FrequencyEditor({ commitment, onChange }: { commitment: ChallengeCommitment; onChange: (frequency: ChallengeCommitment['frequency']) => void }) {
  const kind = commitment.frequency.kind;
  return (
    <View>
      <View style={styles.freqRow}>
        {([['daily', 'Todos os dias'], ['weekdays', 'Dias'], ['weekly', 'Semana'], ['deadline', 'Prazo']] as const).map(([id, label]) => (
          <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: kind === id }} onPress={() => {
            if (id === 'daily') onChange({ kind: 'daily' });
            if (id === 'weekdays') onChange({ kind: 'weekdays', days: commitment.frequency.kind === 'weekdays' ? commitment.frequency.days : [] });
            if (id === 'weekly') onChange({ kind: 'weekly', times: commitment.frequency.kind === 'weekly' ? commitment.frequency.times : 3 });
            if (id === 'deadline') onChange({ kind: 'deadline', date: commitment.frequency.kind === 'deadline' ? commitment.frequency.date : '' });
          }} style={[styles.freq, kind === id && styles.freqOn]}>
            <Text style={styles.freqLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {commitment.frequency.kind === 'weekdays' ? (
        <View style={styles.freqRow}>
          {weekMarks.map((mark, index) => {
            const selected = commitment.frequency.kind === 'weekdays' && commitment.frequency.days.includes(index);
            return (
              <Pressable key={weekNames[index]} accessibilityRole="button" accessibilityLabel={weekNames[index]} accessibilityState={{ selected }} onPress={() => {
                if (commitment.frequency.kind !== 'weekdays') return;
                const days = selected ? commitment.frequency.days.filter((day) => day !== index) : [...commitment.frequency.days, index];
                onChange({ kind: 'weekdays', days });
              }} style={[styles.dayChip, selected && styles.dayChipOn]}>
                <Text style={[styles.freqLabel, selected && styles.modeLabelOn]}>{mark}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {commitment.frequency.kind === 'weekly' ? (
        <View style={styles.freqRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Diminuir meta semanal" onPress={() => commitment.frequency.kind === 'weekly' && onChange({ kind: 'weekly', times: Math.max(1, commitment.frequency.times - 1) })} style={styles.dayChip}><Text style={styles.freqLabel}>-</Text></Pressable>
          <Text style={styles.freqLabel}>{`${commitment.frequency.times} vezes por semana`}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Aumentar meta semanal" onPress={() => commitment.frequency.kind === 'weekly' && onChange({ kind: 'weekly', times: Math.min(7, commitment.frequency.times + 1) })} style={styles.dayChip}><Text style={styles.freqLabel}>+</Text></Pressable>
        </View>
      ) : null}
      {commitment.frequency.kind === 'deadline' ? (
        <TextInput accessibilityLabel="Data do prazo" value={commitment.frequency.date} onChangeText={(value) => onChange({ kind: 'deadline', date: value })} placeholder="AAAA-MM-DD" placeholderTextColor="#8C8882" style={styles.input} />
      ) : null}
    </View>
  );
}

function Square({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label.replace('\n', ' ')} onPress={onPress} style={styles.square}>
      <Mark name={icon} size={18} />
      <Text style={styles.squareLabel}>{label}</Text>
    </Pressable>
  );
}

function HistoryRow({ item, onPress }: { item: ChallengeHistoryItem; onPress: () => void }) {
  const concluded = item.status === 'concluded';
  const rescinded = item.status === 'rescinded';
  const label = concluded ? 'Concluído' : rescinded ? 'Rescindido' : item.status === 'replaced' ? 'Encerrado' : 'Em andamento';
  const when = item.closedAt ? formatChallengeDate(item.closedAt.slice(0, 10)) : formatChallengeDate(item.startsOn);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.historyRow}>
      <Mark name={rescinded ? 'torn' : 'trophy'} color={rescinded ? red : gold} />
      <View style={styles.editCopy}>
        <Text style={styles.historyTitle}>{`Desafio de ${item.durationDays} dias`}</Text>
        <Text style={[styles.historyMeta, rescinded && styles.warning]}>{`${item.durationDays} dias · ${label} em ${when}`}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modality: { color: '#F3EFE8', fontFamily: fonts.display, fontSize: 13, letterSpacing: 1 },
  premium: { borderRadius: 999, backgroundColor: gold, paddingHorizontal: 8, paddingVertical: 3 },
  premiumText: { color: ink, fontFamily: fonts.display, fontSize: 10, letterSpacing: 0.6 },
  headerSpace: { flex: 1 },
  titleRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#F7F4EF', fontFamily: fonts.display, fontSize: 34, letterSpacing: 0.5 },
  banner: { marginTop: 12, height: 132, borderRadius: 16, overflow: 'hidden', backgroundColor: '#14110E' },
  bannerImage: { width: '100%', height: '100%' },
  bannerVeil: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.28)' },
  sectionRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { color: gold, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.8 },
  homeRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  homeCard: { flex: 1, minHeight: 148, borderRadius: 16, borderWidth: 1, borderColor: line, backgroundColor: card, alignItems: 'center', padding: 8, gap: 6 },
  figure: { width: 72, height: 78 },
  homeText: { color: '#F3EFE8', fontFamily: fonts.text, fontSize: 11, lineHeight: 14, textAlign: 'center' },
  durationRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  duration: { flex: 1, minHeight: 34, borderRadius: 999, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  durationOn: { backgroundColor: gold, borderColor: gold },
  durationLabel: { color: gold, fontFamily: fonts.display, fontSize: 12 },
  durationLabelOn: { color: ink },
  rule: { marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: line, backgroundColor: card, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  ruleText: { flex: 1, color: '#F3EFE8', fontFamily: fonts.text, fontSize: 12, lineHeight: 16 },
  goldButton: { marginTop: 14, minHeight: 52, borderRadius: 999, backgroundColor: gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  playButton: { flexDirection: 'row', gap: 8 },
  goldLabel: { color: ink, fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.6 },
  pressed: { opacity: 0.74 },
  note: { marginTop: 14, color: '#C8C2B8', fontFamily: fonts.text, fontSize: 14, lineHeight: 20 },
  warning: { marginTop: 10, color: red, fontFamily: fonts.text, fontSize: 12, lineHeight: 16 },
  screenTitle: { marginTop: 8, color: '#F7F4EF', fontFamily: fonts.display, fontSize: 26, letterSpacing: 0.4 },
  lead: { marginTop: 4, color: '#B7B1A8', fontFamily: fonts.text, fontSize: 14, lineHeight: 18 },
  editCard: { marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: line, backgroundColor: card, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  editCopy: { flex: 1, gap: 4 },
  editTitle: { color: '#F3EFE8', fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.4 },
  example: { color: '#8C8882', fontFamily: fonts.text, fontSize: 12, lineHeight: 16 },
  pencil: { alignItems: 'center', gap: 2, minWidth: 42 },
  pencilLabel: { color: gold, fontFamily: fonts.text, fontSize: 10 },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  freq: { borderRadius: 999, borderWidth: 1, borderColor: line, paddingHorizontal: 6, paddingVertical: 3 },
  freqOn: { backgroundColor: 'rgba(230, 210, 174, 0.18)' },
  freqLabel: { color: gold, fontFamily: fonts.text, fontSize: 10 },
  dayChip: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  dayChipOn: { backgroundColor: gold },
  paper: { marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: line, backgroundColor: card, padding: 14, gap: 6 },
  clauseTitle: { marginTop: 8, color: gold, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.4 },
  clause: { color: '#E7E1D8', fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
  modeRow: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  modeOn: { backgroundColor: gold },
  modeLabel: { color: '#F3EFE8', fontFamily: fonts.display, fontSize: 12 },
  modeLabelOn: { color: ink },
  pad: { height: 120, borderRadius: 12, borderWidth: 1, borderColor: line, backgroundColor: '#080807', overflow: 'hidden' },
  padNote: { color: '#8C8882', fontFamily: fonts.text, textAlign: 'center', marginTop: 48 },
  input: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: line, color: '#F3EFE8', fontFamily: fonts.text, paddingHorizontal: 12 },
  signatureText: { color: gold, fontFamily: fonts.text, fontSize: 20, lineHeight: 26 },
  accept: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  box: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: gold },
  boxOn: { backgroundColor: gold },
  acceptLabel: { color: '#F3EFE8', fontFamily: fonts.text, fontSize: 13 },
  signRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  clear: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  clearLabel: { color: '#C8C2B8', fontFamily: fonts.text, fontSize: 13 },
  signButton: { flex: 1, minHeight: 48, borderRadius: 999, backgroundColor: gold, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { marginTop: 8, color: gold, fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.6 },
  trackCard: { marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: line, backgroundColor: card, padding: 10, flexDirection: 'row', gap: 8 },
  trackCopy: { flex: 1 },
  trackPillar: { color: gold, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.6 },
  trackText: { color: '#F3EFE8', fontFamily: fonts.text, fontSize: 13, lineHeight: 17 },
  dots: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(243,239,232,0.45)' },
  dotOn: { backgroundColor: green, borderColor: green },
  actionRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  square: { flex: 1, minHeight: 92, borderRadius: 16, borderWidth: 1, borderColor: line, backgroundColor: card, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6 },
  squareLabel: { color: '#F3EFE8', fontFamily: fonts.display, fontSize: 11, lineHeight: 13, textAlign: 'center' },
  countRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  countCard: { flex: 1, minHeight: 110, borderRadius: 16, borderWidth: 1, borderColor: line, backgroundColor: card, padding: 10, gap: 6 },
  countDanger: { borderColor: 'rgba(224,122,114,0.7)' },
  countLabel: { color: '#F3EFE8', fontFamily: fonts.display, fontSize: 12, lineHeight: 15 },
  countValue: { color: gold, fontFamily: fonts.display, fontSize: 28 },
  countValueDanger: { color: red },
  historyRow: { marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: line, backgroundColor: card, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  historyTitle: { color: '#F3EFE8', fontFamily: fonts.display, fontSize: 14 },
  historyMeta: { color: green, fontFamily: fonts.text, fontSize: 12 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  dialog: { width: '100%', maxWidth: 420, borderRadius: 18, borderWidth: 1, borderColor: line, backgroundColor: '#100E0C', padding: 16 },
  editor: { marginTop: 10, minHeight: 90, borderRadius: 12, borderWidth: 1, borderColor: line, color: '#F3EFE8', fontFamily: fonts.text, padding: 10, textAlignVertical: 'top' },
  counter: { marginTop: 6, color: '#8C8882', fontFamily: fonts.text, fontSize: 12, textAlign: 'right' },
  rescinded: { width: '100%', maxWidth: 380, borderRadius: 18, borderWidth: 1, borderColor: '#A32632', backgroundColor: '#2A0A0E', padding: 18, alignItems: 'center', gap: 8 },
  noticeClose: { alignSelf: 'flex-end', minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  rescindedTitle: { color: '#F7F4EF', fontFamily: fonts.display, fontSize: 28, lineHeight: 30, textAlign: 'center' },
  rescindedCopy: { color: '#F3EFE8', fontFamily: fonts.text, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
