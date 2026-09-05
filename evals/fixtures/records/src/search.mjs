export function createSearch(lookup, onChange = () => {}) {
  let state = { rows: [], loading: false, error: null };
  function update(patch) {
    state = { ...state, ...patch };
    onChange(state);
  }
  return {
    getState: () => state,
    async search(query) {
      update({ loading: true, error: null });
      try {
        update({ rows: await lookup(query) });
      } catch (error) {
        update({ error: error.message });
      } finally {
        update({ loading: false });
      }
    },
  };
}
