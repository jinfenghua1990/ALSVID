export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'brand';

export type Cell = string | { text: string; tone?: Tone };

export interface Kpi {
  value: string;
  label: string;
  delta?: string;
  tone?: Tone;
}

export interface BarItem {
  name: string;
  percent?: number;
  value?: string;
  extra?: string;
  tag?: string;
  tone?: Tone;
}

export interface ListItem {
  name: string;
  value: string;
  extra?: string;
  tag?: string;
  tone?: Tone;
}

export interface FlowStep {
  label: string;
  state?: string;
}

export interface TimelineItem {
  tag: string;
  time?: string;
  text: string;
}

export interface TaskItem {
  title: string;
  status: string;
  source?: string;
  time?: string;
}

export type Block =
  | { kind: 'platforms'; items: { title: string; details: string[] }[] }
  | { kind: 'form'; title: string; hint?: string; fields: { label: string; value: string }[] }
  | { kind: 'kpis'; items: Kpi[] }
  | {
      kind: 'table';
      title: string;
      hint?: string;
      search?: string;
      filters?: string[];
      columns: string[];
      rows: Cell[][];
    }
  | { kind: 'bars'; title: string; hint?: string; items: BarItem[] }
  | { kind: 'list'; title: string; hint?: string; items: ListItem[] }
  | { kind: 'fields'; title: string; items: string[] }
  | { kind: 'flow'; title: string; hint?: string; steps: FlowStep[] }
  | {
      kind: 'timeline';
      title: string;
      more?: string;
      tabs?: string[];
      items: TimelineItem[];
    }
  | { kind: 'tasks'; title: string; more?: string; items: TaskItem[] }
  | { kind: 'search'; title: string; hint?: string; placeholder: string; fields: string[] }
  | {
      kind: 'trend';
      title: string;
      tabs?: string[];
      legend?: string[];
      note?: string;
      bars: number[];
      axis?: string[];
    };

export interface SecondaryGroup {
  group: string;
  items: string[];
}

export interface Screen {
  steps?: { label: string; href: string }[];
  sourceNode?: string;
  id: string;
  area: string;
  route: string;
  title: string;
  subtitle: string;
  actions?: string[];
  secondary?: SecondaryGroup[];
  blocks: Block[];
}
