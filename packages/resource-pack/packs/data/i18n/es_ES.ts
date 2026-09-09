/** Spanish. Same key set as en_US — the build fails on drift. */
export default {
  ui: {
    players: {
      title: 'Jugadores conectados',
      visit: 'Visitar',
      count: '{{count}} conectados',
    },

    preferences: {
      title: 'Preferencias',
      nickname: 'Apodo',
      nicknamePlaceholder: 'se muestra sobre tu cabeza',
      coordinates: 'Mostrar coordenadas',
      tips: 'Mostrar consejos',
      volume: 'Volumen de la música',
      team: 'Equipo',
      view: 'Vista',
      viewFirst: 'Primera persona',
      viewThird: 'Tercera persona',
      difficulty: 'Dificultad',
      difficultyEasy: 'Fácil',
      difficultyNormal: 'Normal',
      difficultyHard: 'Difícil',
      save: 'Guardar',
      cancel: 'Cancelar',
      saved: 'Preferencias guardadas',
    },
  },
} as const;
