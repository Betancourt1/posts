const PROFILES = Object.freeze({
  notebook: Object.freeze({
    kind: "notebook",
    notebook: true,
    arenaEligible: false,
    settingsTitle: "Notebook",
    deleteLabel: "Eliminar notebook",
    deleteEndpoint: "/api/delete-notebook",
  }),
  post: Object.freeze({
    kind: "post",
    notebook: false,
    arenaEligible: true,
    settingsTitle: "Propiedades",
    deleteLabel: "Eliminar post",
    deleteEndpoint: "/api/delete-page",
  }),
});

export function writingEditorProfile(kind) {
  return kind === "notebook" ? PROFILES.notebook : PROFILES.post;
}
