# Mode switch

A DeepSeek Harness plugin that puts an **Execute / Plan** switch in the composer, so the
current session can move between plan mode and execution mode without remembering a
slash command. It fills the one gap in the built-in plan-mode UI: the shipped Plan chip
only appears *while plan mode is already on*, so turning it on normally means typing
`/plan` or opening the `+` command menu.

Plan mode itself is shipped with DeepSeek Harness (`@deepseek-ai/dsh-plan-mode`): the
agent explores, grounds the plan in the real repository, and presents it for review
before carrying it out. This plugin only adds the persistent chooser.

## What it adds

A compact two-option control in the composer's tool row, next to the permissions pill:

```
[ + ]  [ Workspace write ]  [ Execute | Plan ]
```

- **Execute** — plan mode is off; the agent may make changes.
- **Plan** — plan mode is on; the agent explores and proposes a plan first.

The selected option is highlighted; plan mode tints its label and glyph with the business accent.
Clicking the other option switches the session. A small pulsing dot marks a change that is
queued until the next step of a running turn. At narrow composer widths the labels collapse
to icons, like the sibling permissions control.

## How it works

- State is read from the host-computed `plan` session projection — the same folded,
  logged value the built-in Plan chip uses. There is no plugin-owned state, so reload,
  resume, fork, and compaction all restore the logged mode.
- Both directions are written through the existing `/plan` human command
  (`/plan` to enter, `/plan off` to leave). Mode changes therefore remain logged commands
  and keep the plan-mode package's own pending/queued behavior.
- No Host-side code, new event types, or prompt sections are involved. The plugin's host
  half is an empty row so the Web client half can be discovered and served.

The built-in plan flow is unchanged: the Plan chip still shows while plan mode is on,
`/plan` and `/plan off` still work, `exit_plan_mode` still presents the plan review, and
approving it returns the session to execution mode.

## Requirements

- A DeepSeek Harness profile that composes the plan-mode host package (the default
  `dsh-base` + `dsh-web-app` profile does). Where the `plan` projection is absent, the
  control renders nothing instead of failing.
- The Web client (the control is a client UI surface).

## Limitations

- **Plan mode is guidance, not a sandbox.** It changes what the agent is told to do; tool
  availability stays constant for request-cache stability. Use sandbox mode and approval
  prompts when you need enforced limits.
- The control is bound to one session at a time. Switching sessions changes the displayed
  mode; the modes stay independent per session.
- A change queued while a turn is running is process-local until the agent's next accepted
  step. Reloading the page before it applies loses the queued change; the logged mode is
  unchanged and the control returns to it.
- The composer hides its tool row during a whole-composer interaction such as a plan
  review, so the control is not visible there; use the review buttons or `/plan off`.
- While plan mode is active the built-in Plan chip also appears, to the left of this
  control. The chip's × leaves plan mode directly; this control leaves it by choosing
  Execute.

## Install

Install the directory as a bundle, either from **Plugins → Add plugin** in the app or with
`plugin_manager` `install_bundle` pointed at this directory. The bundle row is named
`dsh-mode-switch` (`@local/dsh-mode-switch`), so it can also be disabled from Plugins
without uninstalling it. Refresh the Web page once after installing so the client bundle
is fetched.

## Package layout

| File | Role |
| --- | --- |
| `cordis.patch.yml` | Inserts the `dsh-mode-switch` row. |
| `index.js` | Empty Host plugin body. |
| `client.js` | Composer control: plan projection read, `/plan` writes, styles, dictionaries. |
| `locale/en.json`, `locale/es.json`, `locale/zh.json` | Plugin Manager title and description. |
| `icon.svg` | Plugin icon. |

## Development

The client half is plain JavaScript loaded through the Harness client module table; React
comes from the page. There is no build step. After editing `client.js` in an installed
linked checkout, refresh the Web page (or use the plugin's HMR path where available) and
check the composer. Styles use only `--dsw-*` theme tokens and are scoped under the
`dsh-mode-switch` prefix.
