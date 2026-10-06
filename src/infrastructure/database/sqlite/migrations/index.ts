import type { Migration } from '../migrator';
import { migration001 } from './001_core_schema';

/** Append new migrations here. Order and ids are permanent. */
export const MIGRATIONS: readonly Migration[] = [migration001];
