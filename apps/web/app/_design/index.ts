import { screensA } from './screens-a';
import { screensB } from './screens-b';
import { screensC } from './screens-c';
import type { Screen } from './types';
import synced from './synced-screens.json';

const reviewed = synced as Screen[];
const previous = [...screensA, ...screensB, ...screensC];
const isLegacyProductRoute = (route: string) => route === '/admin/product' || route.startsWith('/admin/product/');
export const screens: readonly Screen[] = [
  ...previous.filter(screen => !isLegacyProductRoute(screen.route) && !reviewed.some(item => item.route === screen.route)),
  ...reviewed.filter(screen => !isLegacyProductRoute(screen.route)),
];

export function screenById(id: string): Screen {
  const screen = screens.find((item) => item.id === id);
  if (!screen) {
    throw new Error(`未找到设计页面：${id}`);
  }
  return screen;
}

export type { Screen } from './types';
