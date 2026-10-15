import { screensA } from './screens-a';
import { screensB } from './screens-b';
import { screensC } from './screens-c';
import type { Screen } from './types';

export const screens: readonly Screen[] = [...screensA, ...screensB, ...screensC];

export function screenById(id: string): Screen {
  const screen = screens.find((item) => item.id === id);
  if (!screen) {
    throw new Error(`未找到设计页面：${id}`);
  }
  return screen;
}

export type { Screen } from './types';
