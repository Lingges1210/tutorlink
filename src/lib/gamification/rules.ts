export const GAMIFICATION_RULES = {
  student: {
    sessionCompleted: 30,
    streakBonus: 10,
    firstSessionBonus: 20,
  },

  tutor: {
    sessionCompleted: 40,
    highRatingBonus: 15,
  },

  limits: {
    maxPointsPerDay: 300,
  },

  description: [
    "Students earn 30 points for each completed session.",
    "Tutors earn 40 points for each completed session.",
    "Streak bonuses may apply.",
    "Bonus points may be awarded for special achievements.",
  ],
};