# Mode switch

A DeepSeek Harness plugin that adds the composer's missing **Plan** control, so a session can
enter plan mode with one click instead of remembering a slash command. It completes the
built-in plan-mode UI: the shipped Plan chip only appears *while plan mode is already on*, so
before this plugin the only way in was `/plan` or the `+` command menu.

Plan mode itself is shipped with DeepSeek Harness (`@deepseek-ai/dsh-plan-mode`): the agent
explores, grounds the plan in the real repository, and presents it for review before carrying
it out. This plugin only adds the way in.

## What it adds

While plan mode is **off**, a neutral Plan button sits in the composer's mode cluster, next
to the permissions pill:

```
[ + ]  [ Workspace write ]  [ Plan ]
```

Click it to enter plan mode. The button disappears and the built-in **Plan chip** takes its
place, in the same position and with the same chrome:

```
[ + ]  [ Workspace write ]  [ Plan × ]
```

Click the chip to return to execution mode. The two affordances are never on screen at the
same time: this plugin renders exactly where the chip does not, so there is always one Plan
control and no duplicate.

## How it works

- Both controls read the same host-computed `plan` session projection. The shipped chip
  renders while the folded target is plan mode (including a pending entry); this plugin
  renders only while the settled log says plan mode is off. The visibility rules are exact
  complements.
- Entering is written through the existing `/plan` human command, so the mode stays a logged
  command and keeps the plan-mode package's pending/queued behavior. Leaving uses the shipped
  chip's own `/plan off`.
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
- The control is bound to one session at a time; plan state stays independent per session.
- During a plan-mode change that is queued for a running turn's next step, neither control is
  visible; the chosen state is shown by the built-in chip's own rules once it applies.
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
| `client.js` | Composer Plan button: projection read, `/plan` call, styles, dictionaries. |
| `locale/en.json`, `locale/es.json`, `locale/zh.json` | Plugin Manager title and description. |
| `icon.svg` | Plugin icon. |

## Development

The client half is plain JavaScript loaded through the Harness client module table; React
comes from the page. There is no build step. After editing `client.js` in an installed linked
checkout, the Host's bundle watcher hot-swaps the plugin; refresh the page if it does not.
Styles use only `--dsw-*` theme tokens and are scoped under the `dsh-plan-entry` prefix.
