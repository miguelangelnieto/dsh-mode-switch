/**
 * Host half of the Mode switch plugin: none.
 *
 * The plugin is a pure UI surface. Plan state, the `/plan` command, the
 * `plan:policy` prompt section, and the `exit_plan_mode` tool all belong to
 * the plan-mode package, which the profile composes independently. This row
 * exists so the plugin appears in the Loader and Plugin Manager and so its
 * `dsh.client` half is discovered and served to the Web client.
 */
export function apply() {}
