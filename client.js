/**
 * Browser half of the Mode switch plugin: a two-option control in the
 * composer that selects plan mode or execution mode for the current Session.
 *
 * The control occupies the conversation's `conversation.input.left` seat. It
 * reads the host-folded `plan` Session projection (the value the shipped plan
 * chip reads) and writes through the existing `/plan` human command, so the
 * mode stays logged in the Session, survives resume and forks, and needs no
 * new event type or Host-side plugin.
 *
 * Plain JavaScript: the page provides React through the client module table,
 * and the module registers a lazy factory instead of relying on a bundler.
 * Styles reference only `--dsw-*` theme tokens, are scoped by this plugin's
 * `dsh-mode-switch` prefix, and unmount with the component.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-mode-switch',
  factory(require) {
    const React = require('react')
    const { Fragment, useEffect, useRef, useState } = React
    const h = React.createElement

    /** Dictionary namespace owned by this plugin. */
    const NS = 'mode-switch'
    /** Session Projection key owned by the plan-mode package. */
    const PLAN_PROJECTION = 'plan'

    const en = {
      group: 'Session mode',
      execute: 'Execute',
      plan: 'Plan',
      modeExecute: 'Execute mode',
      modePlan: 'Plan mode',
      titleExecute: 'Execution mode: the agent may make changes.',
      titlePlan: 'Plan mode: the agent explores and proposes a plan before making changes.',
      pending: 'Applying the mode change.',
      error: 'Could not switch mode.',
    }

    const es = {
      group: 'Modo de la sesión',
      execute: 'Ejecutar',
      plan: 'Plan',
      modeExecute: 'Modo ejecución',
      modePlan: 'Modo plan',
      titleExecute: 'Modo ejecución: el agente puede hacer cambios.',
      titlePlan: 'Modo plan: el agente explora y propone un plan antes de hacer cambios.',
      pending: 'Aplicando el cambio de modo.',
      error: 'No se pudo cambiar de modo.',
    }

    const zh = {
      group: '会话模式',
      execute: '执行',
      plan: '计划',
      modeExecute: '执行模式',
      modePlan: '计划模式',
      titleExecute: '执行模式：代理可以进行更改。',
      titlePlan: '计划模式：代理先探索并提出计划，再做更改。',
      pending: '正在应用模式切换。',
      error: '无法切换模式。',
    }

    const CSS = `
.dsh-mode-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  height: 28px;
  padding: 2px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-mode-switch-option {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.dsh-mode-switch-glyph {
  display: inline-flex;
  flex: 0 0 auto;
}
.dsh-mode-switch-glyph svg {
  display: block;
}
@media (hover: hover) {
  .dsh-mode-switch-option:hover:not([aria-disabled="true"]):not([aria-pressed="true"]) {
    color: var(--dsw-alias-label-primary);
  }
}
.dsh-mode-switch-option:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.dsh-mode-switch-option[aria-disabled="true"] {
  cursor: default;
  opacity: 0.6;
}
.dsh-mode-switch-option[aria-pressed="true"] {
  background: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
}
.dsh-mode-switch-option[data-mode="plan"][aria-pressed="true"] {
  color: var(--dsw-alias-state-business-primary);
}
.dsh-mode-switch-pending {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.55;
  animation: dsh-mode-switch-pulse 1.2s ease-in-out infinite;
}
@keyframes dsh-mode-switch-pulse {
  0%, 100% { opacity: 0.22; }
  50% { opacity: 0.65; }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-mode-switch-pending { animation: none; opacity: 0.5; }
}
.dsh-mode-switch-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.dsh-mode-switch-error {
  min-width: 0;
  max-width: 180px;
  overflow: hidden;
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Icon-only below the composer's compact width: the sibling mode chips
   collapse their labels at the same point. */
@container (max-width: 460px) {
  .dsh-mode-switch-label {
    display: none;
  }
}
`

    /** Document-with-lines glyph for plan mode. */
    function PlanGlyph() {
      return h('svg', {
        viewBox: '0 0 14 14', width: 14, height: 14,
        fill: 'none', 'aria-hidden': 'true',
      }, [
        h('rect', {
          key: 'sheet',
          x: 3, y: 2.4, width: 8, height: 9.2, rx: 1.9,
          stroke: 'currentColor', strokeWidth: 1.3,
        }),
        h('path', {
          key: 'lines',
          d: 'M5.4 5.5h3.2M5.4 7.6h3.2M5.4 9.7h2',
          stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round',
        }),
      ])
    }

    /** Play glyph for execution mode. */
    function ExecuteGlyph() {
      return h('svg', {
        viewBox: '0 0 14 14', width: 14, height: 14,
        fill: 'none', 'aria-hidden': 'true',
      }, h('path', {
        d: 'M5.2 3.7 10.1 7l-4.9 3.3V3.7Z',
        stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round',
      }))
    }

    /**
     * The composer mode chooser.
     * @param props seat runtime props (`useProjection`, `sessionId`, `t`) plus
     *   the injected `switchMode` writer.
     */
    function ModeSwitch({ useProjection, sessionId, switchMode, t: translate }) {
      const t = typeof translate === 'function' ? translate : key => key
      const plan = useProjection(PLAN_PROJECTION)
      const [picked, setPicked] = useState(null)
      const [busy, setBusy] = useState(false)
      const [failure, setFailure] = useState(null)
      const inFlight = useRef(false)

      // Host-folded target: a pending selection shows the state it targets.
      // A null projection value means the same as an absent one.
      const effective = plan === null || plan === undefined
        ? undefined
        : plan.pending ? !plan.active : plan.active

      // A different Session owns different mode state.
      useEffect(() => {
        setPicked(null)
        setBusy(false)
        setFailure(null)
      }, [sessionId])

      // Drop the local pick once the Host value confirms it.
      useEffect(() => {
        if (picked !== null && effective === picked) setPicked(null)
      }, [effective, picked])

      // A pick the Host never confirms must not outlive the round trip.
      useEffect(() => {
        if (picked === null) return undefined
        const timer = setTimeout(() => {
          setPicked(current => (current === picked ? null : current))
        }, 6000)
        return () => { clearTimeout(timer) }
      }, [picked])

      if (effective === undefined) return null

      const selected = picked !== null ? picked : effective
      const pending = picked !== null || plan.pending
      const choose = target => {
        // The ref closes the same-tick gap that state cannot: two rapid clicks
        // must not dispatch twice.
        if (inFlight.current || target === selected) return
        inFlight.current = true
        setBusy(true)
        setPicked(target)
        setFailure(null)
        Promise.resolve()
          .then(() => switchMode(target))
          .then(outcome => {
            inFlight.current = false
            setBusy(false)
            if (outcome !== undefined && outcome.ok === true) return
            setPicked(null)
            setFailure(outcome !== undefined && typeof outcome.message === 'string'
              ? outcome.message
              : t('error'))
          }, reason => {
            inFlight.current = false
            setBusy(false)
            setPicked(null)
            setFailure(reason instanceof Error ? reason.message : String(reason))
          })
      }

      const option = (mode, label, accessibleName, title, glyph, pressed) => h('button', {
        key: mode,
        type: 'button',
        className: 'dsh-mode-switch-option',
        'data-mode': mode,
        'aria-pressed': pressed ? 'true' : 'false',
        'aria-label': accessibleName,
        // `aria-disabled` instead of `disabled` keeps keyboard focus in place
        // while a switch is in flight; choose() ignores the click.
        'aria-disabled': busy ? 'true' : undefined,
        title,
        // Keep the caret in the composer: selecting a mode must not end the draft.
        onMouseDown: event => { event.preventDefault() },
        onClick: () => { choose(mode === 'plan') },
      }, [
        h('span', { key: 'glyph', className: 'dsh-mode-switch-glyph' }, glyph),
        h('span', { key: 'label', className: 'dsh-mode-switch-label' }, label),
        pressed && pending
          ? h('span', { key: 'pending', className: 'dsh-mode-switch-pending', 'aria-hidden': 'true' })
          : null,
      ])

      return h(Fragment, null,
        h('style', { key: 'style' }, CSS),
        h('span', {
          key: 'group',
          className: 'dsh-mode-switch',
          role: 'group',
          'aria-label': t('group'),
          'aria-busy': pending || busy ? 'true' : undefined,
        }, [
          option('execute', t('execute'), t('modeExecute'), t('titleExecute'), h(ExecuteGlyph), selected === false),
          option('plan', t('plan'), t('modePlan'), t('titlePlan'), h(PlanGlyph), selected === true),
          pending
            ? h('span', { key: 'pending-status', className: 'dsh-mode-switch-sr', role: 'status' }, t('pending'))
            : null,
          failure === null
            ? null
            : h('span', {
              key: 'error',
              className: 'dsh-mode-switch-error',
              role: 'status',
              title: failure,
            }, t('error')),
        ]),
      )
    }

    return {
      // `remote.commands` is the generated namespace that owns the /plan
      // invocation; declaring it keeps activation behind the Remote assembly.
      inject: ['slots', 'locale', 'remote', 'remote.commands'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, es, zh }), 'mode-switch: dictionaries')

        /** Read the Remote-envelope outcome and translate it into a switch result. */
        const dispatch = async (sessionId, line) => {
          const commands = ctx.remote === undefined ? undefined : ctx.remote.commands
          if (commands === undefined || typeof commands.execute !== 'function') {
            return { ok: false, message: 'the /plan command is unavailable in this client' }
          }
          let result
          try {
            result = await commands.execute(sessionId, line, [])
          } catch (reason) {
            return { ok: false, message: reason instanceof Error ? reason.message : String(reason) }
          }
          if (result === undefined || result.ok !== true) {
            const error = result === undefined ? undefined : result.error
            return {
              ok: false,
              message: error === undefined
                ? `could not execute ${line}`
                : `${String(error.message)} (${String(error.code)})`,
            }
          }
          const execution = result.value
          if (execution === undefined) return { ok: false, message: `unknown command: ${line}` }
          const outcome = execution.result
          if (outcome !== undefined && outcome.kind === 'error') {
            return { ok: false, message: String(outcome.text) }
          }
          return { ok: true }
        }

        ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
          name: 'conversation.input.left',
          id: 'mode-switch',
          order: 0,
          locale: NS,
          inject: sessionId => ({
            // Entering and leaving both ride the plan-mode package's own
            // human command, so the mode change stays a logged command.
            switchMode: active => dispatch(sessionId, active ? '/plan' : '/plan off'),
          }),
        }, ModeSwitch))
      },
    }
  },
})
