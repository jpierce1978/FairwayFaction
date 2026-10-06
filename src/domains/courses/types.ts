import type { CourseId, CourseTeeId, HoleId } from '@/types/ids';

export interface Course {
  id: CourseId;
  name: string;
  location: string | null;
  timezone: string;
  numberOfHoles: 9 | 18;
}

export interface CourseTee {
  id: CourseTeeId;
  courseId: CourseId;
  name: string;
  color: string;
  category: string | null;
  rating: number;
  slope: number;
  totalYardage: number;
}

export interface Hole {
  id: HoleId;
  courseId: CourseId;
  holeNumber: number;
  par: number;
}

/** Per-tee hole data. Kept separate from future GPS geometry (HoleGeometry). */
export interface TeeHole {
  courseTeeId: CourseTeeId;
  holeId: HoleId;
  yardage: number;
  /** Stroke index / handicap ranking of the hole, 1 (hardest) to N. */
  handicapIndex: number;
}
