# Mode switch

A DeepSeek Harness plugin that adds the composer's missing **Plan** control, so a session can
enter plan mode with one click instead of remembering a slash command. It completes the
built-in plan-mode UI: the shipped Plan chip only appears *while plan mode is already on*, so
before this plugin the only way in was `/plan` or the `+` command menu.

Plan mode itself is shipped with DeepSeek Harness (`@deepseek-ai/dsh-plan-mode`): the agent
explores, grounds the plan in the real repository, and presents it for review before carrying
it out. This plugin only adds the way in.

## What it adds

While the effective mode is **execution**, a neutral Plan pill sits in the composer's mode
cluster, next to the permissions pill:

```
[ + ]  [ Workspace write ]  [ Plan ]
```

Click it to enter plan mode. The pill disappears and the built-in **Plan chip** takes its
place, in the same position:

```
[ + ]  [ Workspace write ]  [ Plan × ]
```

Click the chip to return to execution mode. The two affordances are never on screen at the
same time: the plugin renders whenever the chip's folded target is execution, so there is
always one Plan control and no duplicate.

To make the handoff read as one control, the pill reuses the chip's own identity:

- the same localized label in every shipped locale — `Plan`, `Planificar`, `计划`, `計画`,
  `Planifier`, `Planen`, `План`, `Plano`;
- the same plan artwork and stroke weight (viewBox 16, 14 px, regular 1 px strokes), so the
  glyph does not jump;
- the same 28 px pill geometry, padding, and position;
- the same “state + action + command” copy voice, including the `/plan` shortcut.

Hovering or focusing the pill swaps its plan glyph for a circled plus, mirroring the chip's
hover circle-x. Mouse clicks keep the caret in the composer.

## How it works

- Both controls read the same host-computed `plan` session projection. The pill renders
  whenever the effective target — `pending ? !active : active` — is execution, which is the
  exact complement of the chip's visibility.
- Entering is written through the existing `/plan` human command, so the mode stays a logged
  command and keeps the plan-mode package's pending/queued behavior. Leaving uses the shipped
  chip's own `/plan off`.
- During a queued exit the pill stays visible but disabled and busy (“leaving after this
  step”), so the mode cluster never goes blank while the change waits for the agent's next
  accepted step.
- The pill hides in a removed Session; the `conversation.input.left` seat receives no
  `locked` prop of its own, so this is the state the plugin can observe locally.
- No Host-side code, new event types, or prompt sections are involved. The plugin's host half
  is an empty row so the Web client half is discovered and served.

The rest of the built-in flow is unchanged: `/plan` and `/plan off` still work, the placeholder
switches to the plan hint while plan mode is on, `exit_plan_mode` still presents the plan
review, and approving it returns the session to execution mode.

## Requirements

- A DeepSeek Harness profile that composes the plan-mode host package (the default
  `dsh-base` + `dsh-web-app` profile does). Where the `plan` projection is absent, the plugin
  renders nothing instead of failing.
- The shipped Plan chip (`@deepseek-ai/dsh-client-ui-plan`, part of the default `dsh-web-app`
  bundle). It is the control's on-state and the way back to execution; without it, use
  `/plan off` to leave plan mode.
- The Web client (the control is a client UI surface).

## Limitations

- **Plan mode is guidance, not a sandbox.** It changes what the agent is told to do; tool
  availability stays constant for request-cache stability. Use sandbox mode and approval
  prompts when you need enforced limits.
- The queued-exit pill is a status, not a cancel action; a selection waiting for the next
  step cannot be undone from the composer.
- Keyboard focus falls back to the page when the chip replaces the focused pill (the two
  controls live in different seats); the plugin leaves focus handling to the host.
- The composer hides its tool row during a whole-composer interaction such as a plan review,
  so the control is not visible there; use the review buttons or the chip.

## Install

Install the directory as a bundle, either from **Plugins → Add plugin** in the app or with
`plugin_manager` `install_bundle` pointed at this directory. The bundle row is named
`dsh-mode-switch` (`@local/dsh-mode-switch`), so it can also be disabled from Plugins without
uninstalling it. Refresh the Web page once after installing so the client bundle is fetched.

## Package layout

| File | Role |
| --- | --- |
| `cordis.patch.yml` | Inserts the `dsh-mode-switch` row. |
| `index.js` | Empty Host plugin body. |
| `client.js` | Composer Plan pill: projection read, `/plan` call, glyphs, styles, eight control dictionaries. |
| `locale/en.json`, `locale/es.json`, `locale/zh.json` | Plugin Manager title and description (other languages fall back to English). |
| `icon.svg` | Plugin icon. |

## Development

The client half is plain JavaScript loaded through the Harness client module table; React
comes from the page. There is no build step. After editing `client.js` in an installed linked
checkout, the Host's bundle watcher hot-swaps the plugin; refresh the page if it does not.
Styles use only `--dsw-*` theme tokens and are scoped under the `dsh-plan-entry` prefix.
