import type { SqlExecutor } from '../types';
import { toScoreEvent } from './scoreRepository';
import type { RoundContext } from '@/games/core/types';
import type { Course, CourseTee, Hole, TeeHole } from '@/domains/courses/types';
import type { Round, RoundPlayer, RoundTeam, RoundTeamMember } from '@/domains/rounds/types';
import type { GameInstance } from '@/domains/games/types';
import type { JsonObject } from '@/types/common';
import {
  asId,
  type CourseId,
  type CourseTeeId,
  type FactionId,
  type GameInstanceId,
  type GamePresetId,
  type GuestProfileId,
  type HoleId,
  type RoundId,
  type RoundPlayerId,
  type RoundTeamId,
  type ScheduledRoundId,
  type ScoringGroupId,
  type UserId,
} from '@/types/ids';

type Row = Record<string, string | number | null>;
const s = (v: unknown) => v as string;
const sn = (v: unknown) => v as string | null;
const n = (v: unknown) => v as number;

/** Reads a complete RoundContext snapshot from local SQLite for the game engine. */
export async function loadRoundContext(
  db: SqlExecutor,
  roundId: RoundId,
): Promise<RoundContext | null> {
  const roundRow = await db.get<Row>('SELECT * FROM rounds WHERE id = ?', [roundId]);
  if (!roundRow) return null;
  const courseRow = await db.get<Row>('SELECT * FROM courses WHERE id = ?', [
    s(roundRow.course_id),
  ]);
  if (!courseRow) return null;

  const [holes, tees, teeHoles, players, teams, members, scores] = await Promise.all([
    db.all<Row>('SELECT * FROM holes WHERE course_id = ? ORDER BY hole_number', [s(courseRow.id)]),
    db.all<Row>('SELECT * FROM course_tees WHERE course_id = ?', [s(courseRow.id)]),
    db.all<Row>(
      `SELECT th.* FROM tee_holes th JOIN course_tees t ON t.id = th.course_tee_id WHERE t.course_id = ?`,
      [s(courseRow.id)],
    ),
    db.all<Row>('SELECT * FROM round_players WHERE round_id = ? ORDER BY start_order, id', [
      roundId,
    ]),
    db.all<Row>('SELECT * FROM round_teams WHERE round_id = ? ORDER BY display_order, id', [
      roundId,
    ]),
    db.all<Row>(
      `SELECT m.* FROM round_team_members m JOIN round_teams t ON t.id = m.team_id WHERE t.round_id = ?`,
      [roundId],
    ),
    db.all<Row>('SELECT * FROM score_events WHERE round_id = ?', [roundId]),
  ]);

  const round: Round = {
    id: roundId,
    factionId:
      roundRow.faction_id === null
        ? null
        : (asId<'FactionId'>(s(roundRow.faction_id)) as FactionId),
    scheduledRoundId:
      roundRow.scheduled_round_id === null
        ? null
        : (asId<'ScheduledRoundId'>(s(roundRow.scheduled_round_id)) as ScheduledRoundId),
    courseId: asId<'CourseId'>(s(roundRow.course_id)) as CourseId,
    startedAt: sn(roundRow.started_at),
    completedAt: sn(roundRow.completed_at),
    status: s(roundRow.status) as Round['status'],
    createdBy: asId<'UserId'>(s(roundRow.created_by)) as UserId,
    localVersion: n(roundRow.local_version),
    cloudVersion: n(roundRow.cloud_version),
  };

  const course: Course = {
    id: round.courseId,
    name: s(courseRow.name),
    location: sn(courseRow.location),
    timezone: s(courseRow.timezone),
    numberOfHoles: n(courseRow.number_of_holes) as 9 | 18,
  };

  return {
    round,
    course,
    holes: holes.map((h): Hole => ({
      id: asId<'HoleId'>(s(h.id)) as HoleId,
      courseId: course.id,
      holeNumber: n(h.hole_number),
      par: n(h.par),
    })),
    tees: tees.map((t): CourseTee => ({
      id: asId<'CourseTeeId'>(s(t.id)) as CourseTeeId,
      courseId: course.id,
      name: s(t.name),
      color: s(t.color),
      category: sn(t.category),
      rating: n(t.rating),
      slope: n(t.slope),
      totalYardage: n(t.total_yardage),
    })),
    teeHoles: teeHoles.map((t): TeeHole => ({
      courseTeeId: asId<'CourseTeeId'>(s(t.course_tee_id)) as CourseTeeId,
      holeId: asId<'HoleId'>(s(t.hole_id)) as HoleId,
      yardage: n(t.yardage),
      handicapIndex: n(t.handicap_index),
    })),
    players: players.map((p): RoundPlayer => ({
      id: asId<'RoundPlayerId'>(s(p.id)) as RoundPlayerId,
      roundId,
      userId: p.user_id === null ? null : (asId<'UserId'>(s(p.user_id)) as UserId),
      guestProfileId:
        p.guest_profile_id === null
          ? null
          : (asId<'GuestProfileId'>(s(p.guest_profile_id)) as GuestProfileId),
      displayNameSnapshot: s(p.display_name_snapshot),
      teeId: p.tee_id === null ? null : (asId<'CourseTeeId'>(s(p.tee_id)) as CourseTeeId),
      handicapSnapshot: p.handicap_snapshot as number | null,
      scoringGroupId:
        p.scoring_group_id === null
          ? null
          : (asId<'ScoringGroupId'>(s(p.scoring_group_id)) as ScoringGroupId),
      startOrder: n(p.start_order),
      status: s(p.status) as RoundPlayer['status'],
    })),
    teams: teams.map((t): RoundTeam => ({
      id: asId<'RoundTeamId'>(s(t.id)) as RoundTeamId,
      roundId,
      name: s(t.name),
      displayOrder: n(t.display_order),
    })),
    teamMembers: members.map((m): RoundTeamMember => ({
      teamId: asId<'RoundTeamId'>(s(m.team_id)) as RoundTeamId,
      roundPlayerId: asId<'RoundPlayerId'>(s(m.round_player_id)) as RoundPlayerId,
    })),
    scores: scores.map((r) => toScoreEvent(r as unknown as Parameters<typeof toScoreEvent>[0])),
  };
}

export async function loadGameInstances(
  db: SqlExecutor,
  roundId: RoundId,
): Promise<GameInstance[]> {
  const rows = await db.all<Row>('SELECT * FROM game_instances WHERE round_id = ? ORDER BY id', [
    roundId,
  ]);
  return rows.map((r) => ({
    id: asId<'GameInstanceId'>(s(r.id)) as GameInstanceId,
    roundId,
    gameDefinitionKey: s(r.game_definition_key),
    gameDefinitionVersion: n(r.game_definition_version),
    presetId: r.preset_id === null ? null : (asId<'GamePresetId'>(s(r.preset_id)) as GamePresetId),
    configuration: JSON.parse(s(r.configuration)) as JsonObject,
    status: s(r.status) as GameInstance['status'],
  }));
}
