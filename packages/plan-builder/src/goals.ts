/** "What do you want back" — framed as what the reclaimed time is *for*, not what's being
 *  blocked. This is what makes the plan reveal feel personal rather than mechanical. */
export interface Goal {
  id: string;
  label: string;
  icon: string;
}

export const GOALS: Goal[] = [
  { id: "focus_work", label: "Focus at work", icon: "🎯" },
  { id: "more_sleep", label: "More sleep", icon: "🌙" },
  { id: "be_present", label: "Being present with family", icon: "👨‍👩‍👧" },
  { id: "finish_project", label: "Finishing a project", icon: "📚" },
  { id: "just_because", label: "Just want my time back", icon: "⏳" },
];

export function findGoal(id: string): Goal | undefined {
  return GOALS.find((goal) => goal.id === id);
}
