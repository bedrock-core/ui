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
      volume: 'Volumen de la música',
      team: 'Equipo',
      view: 'Vista',
      viewFirst: 'Primera persona',
      viewThird: 'Tercera persona',
      save: 'Guardar',
      cancel: 'Cancelar',
      saved: 'Preferencias guardadas',
    },
  },
} as const;
